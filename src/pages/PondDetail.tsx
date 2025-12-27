import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Pond, getPondDetail, getBreedingRecords, getTrendData } from '@/services/ponds';
import { GroupInfo, getGroupInfo, GroupUser } from '@/services/groups';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import CustomDatePicker from '@/components/CustomDatePicker';
import TrendChart from '@/components/TrendChart';
import { 
  getRecordTypeChineseName, 
  getFullDisplayItems, 
  getRecordIcon, 
  DisplayItem 
} from '@/utils/recordUtils';
import { DEFAULT_EXPORT_TYPES, startExport, downloadExport } from '@/services/export';
import { downloadBinaryFile } from '@/utils/download';
import { format as fmt } from 'date-fns';

// FarmingRecord interface for the timeline
interface FarmingRecord {
  id: number;
  time: string;
  date: string;
  image?: string;
  rawTime?: string; // For sorting
  type: string;
  typeName: string;
  displayItems: DisplayItem[];
  detail: any;
}

// Extend Pond to include extra info needed for the view
interface PondDetailInfo extends Pond {
  records?: FarmingRecord[];
  groupInfo?: GroupInfo;
}

// Helper to extract time from record
const getRecordTime = (detail: any, type: string) => {
  if (detail.operate_at) return detail.operate_at;
  
  const typeBase = type.replace('_data', '');
  const timeFields: Record<string, string> = {
      'feeding': 'feed_time',
      'waterquality': 'measured_at',
      'lossing': 'lossed_at',
      'outfishpond': 'outfishpond_at',
      'seed': 'seeded_at',
      'patrol': 'created_at'
  };
  const field = timeFields[typeBase] || 'created_at';
  return detail[field] || detail.operate_time || detail.created_at || new Date().toISOString();
};

const formatTimeDisplay = (timeStr: string) => {
  try {
    const date = new Date(timeStr.replace(/-/g, '/'));
    if (isNaN(date.getTime())) return { date: '--', time: '--' };
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return {
        date: `${m}-${d}`,
        time: `${h}:${min}`
    };
  } catch (e) {
    return { date: '--', time: '--' };
  }
};

/**
 * 塘口详情页 (PondDetail)
 * 作用：展示特定塘口的详细信息，包括养殖记录、水质趋势图、塘口基本信息及人员。
 * 输入：URL 参数 id (塘口ID)
 * 输出：塘口详情 UI
 * 逻辑：
 *  1. 获取塘口详情 (getPondDetail)
 *  2. 获取关联群组信息 (getGroupInfo)
 *  3. 获取养殖记录 (getBreedingRecords) 并进行格式化和排序
 *  4. 渲染三个主要区域：记录列表(左)、趋势图(中)、信息面板(右)
 * 样式：
 *  - 使用 Flex 布局分隔头部和主体
  *  - 主体分为三栏，使用 gap 分隔
  *  - 各区域圆角 rounded-md，白色背景，阴影
  */
const PondDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pond, setPond] = useState<PondDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Trend Chart State
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: startOfDay(subDays(new Date(), 6)), // Last 7 days including today
    endDate: endOfDay(new Date())
  });

  // Sidebar visibility states
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const leftLockRef = useRef(false);
  const rightLockRef = useRef(false);
  const handleToggleLeft = useCallback(() => {
    if (leftLockRef.current) return;
    leftLockRef.current = true;
    setShowLeftPanel(prev => !prev);
    setTimeout(() => {
      leftLockRef.current = false;
    }, 320);
  }, [setShowLeftPanel]);
  const handleToggleRight = useCallback(() => {
    if (rightLockRef.current) return;
    rightLockRef.current = true;
    setShowRightPanel(prev => !prev);
    setTimeout(() => {
      rightLockRef.current = false;
    }, 320);
  }, [setShowRightPanel]);

  useEffect(() => {
    if (id) {
       setLoading(true);
       const fetchData = async () => {
         try {
           // Fetch Pond Detail
           const pondRes = await getPondDetail(id);
           const pondData = pondRes.data;

           let groupData = null;
           if (pondData.group_id) {
             // Fetch Group Info using group_id from pond details
             const groupRes = await getGroupInfo(pondData.group_id);
             groupData = groupRes.data;
           }
           
           // Fetch Breeding Records
           let records: FarmingRecord[] = [];
           try {
             const recordsRes = await getBreedingRecords(id);
             const rawList = recordsRes.data && Array.isArray(recordsRes.data) ? recordsRes.data : (Array.isArray(recordsRes) ? recordsRes : []);
             
             records = rawList.map((item: any) => {
                const detail = item.detail || item;
                const type = item.type || 'unknown';
                const timeStr = getRecordTime(detail, type);
                const { date, time } = formatTimeDisplay(timeStr);
                
                // Try to find an image
                const image = detail.image_url || (Array.isArray(detail.images) && detail.images.length > 0 ? detail.images[0] : undefined) || detail.picture_url;
                
                const typeName = getRecordTypeChineseName(type);
                const displayItems = getFullDisplayItems(detail, type);

                return {
                    id: detail.id || Math.random(),
                    time,
                    date,
                    image,
                    rawTime: timeStr,
                    type,
                    typeName,
                    displayItems,
                    detail
                };
             }).sort((a: FarmingRecord, b: FarmingRecord) => {
                const timeA = new Date(a.rawTime || '').getTime();
                const timeB = new Date(b.rawTime || '').getTime();
                return timeB - timeA;
             });
           } catch (err) {
             console.error('Error fetching records:', err);
           }

           setPond({
             ...pondData,
             records: records,
             groupInfo: groupData
           });
         } catch (err) {
           console.error('Error fetching pond details:', err);
         } finally {
           setLoading(false);
         }
       };
       fetchData();
    }
  }, [id]);

  // Fetch Trend Data when id or dateRange changes
  useEffect(() => {
    if (id && dateRange.startDate && dateRange.endDate) {
      setTrendLoading(true);
      const fetchTrend = async () => {
        try {
          const params = {
            start_time: format(dateRange.startDate, 'yyyy-MM-dd HH:mm:ss'),
            end_time: format(dateRange.endDate, 'yyyy-MM-dd HH:mm:ss'),
            pond_id: parseInt(id),
            type: ['waterquality_data']
          };
          const res = await getTrendData(params);
          const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          setTrendData(data);
        } catch (err) {
          console.error('Error fetching trend data:', err);
          setTrendData([]);
        } finally {
          setTrendLoading(false);
        }
      };
      fetchTrend();
    }
  }, [id, dateRange]);

  const getRoleName = (user: GroupUser, ownerId: number) => {
    if (user.id === ownerId) return '创建者';
    if (user.admin) return '管理员';
    return '观众';
  };

  const handleExport = async () => {
    if (!id || exporting) return;
    setExporting(true);
    try {
      const startRes = await startExport({
        type: DEFAULT_EXPORT_TYPES,
        pond_id: parseInt(id),
        start_time: '1999-01-01 00:00:00',
        end_time: '2029-01-31 00:00:00'
      });
      const jobId = startRes?.job_id || startRes?.data?.job_id || startRes;
      if (!jobId) return;
      const res = await downloadExport(jobId);
      const name = pond?.name || 'pond';
      const ts = fmt(new Date(), 'yyyyMMdd_HHmm');
      downloadBinaryFile(`${name}_${id}_${ts}.xlsx`, res.data);
    } finally {
      setExporting(false);
    }
  };

  if (loading || !pond) return <div className="flex h-full items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden gap-3">
      {/* Top Header Row (Back) */}
      <div className="h-12 bg-white rounded-md flex items-center px-4 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors" onClick={() => navigate('/')}>
           <ChevronLeft size={20} />
           <span className="font-bold text-lg">{pond.name}</span>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-3">
        {/* Left Column: Farming Records (Timeline) */}
        <div 
          className={`relative rounded-md flex flex-col h-full bg-white shrink-0 shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${showLeftPanel ? 'w-[400px] opacity-100' : 'w-0 opacity-0 border-none'}`}
        >
           {/* Pond Avatar Area */}
           <div className="p-4 border-b border-gray-100 flex flex-col items-center">
             <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 mb-2 shadow-sm">
               {pond.picture_url ? (
                 <img src={pond.picture_url} alt={pond.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">无图</div>
               )}
             </div>
             <h3 className="font-bold text-gray-900">{pond.name}</h3>
           </div>

           <div className="p-4 pb-2">
             <h3 className="font-bold text-gray-900 text-lg">养殖记录</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="relative">
                 {pond.records && pond.records.length > 0 ? (
                   pond.records.map((record, index) => {
                     const iconSrc = getRecordIcon(record.type);
                     return (
                       <div key={record.id} className="flex relative min-h-[120px] mb-2 group">
                           {/* Left: Time */}
                           <div className="w-16 flex flex-col items-end pr-2 text-right shrink-0 pt-1">
                               <span className="text-lg font-bold text-gray-800 leading-none">{record.time}</span>
                               <span className="text-xs text-gray-400 mt-1">{record.date}</span>
                           </div>

                           {/* Center: Timeline */}
                           <div className="w-10 flex flex-col items-center relative shrink-0">
                               {/* Line Top (only if not first) */}
                               <div className={`w-[2px] bg-gray-200 absolute top-0 bottom-0 left-1/2 -translate-x-1/2 ${index === 0 ? 'top-4' : ''}`}></div>
                               {/* Icon Node */}
                               <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 relative mt-0">
                                   <img src={iconSrc} alt={record.type} className="w-5 h-5 object-contain" />
                               </div>
                           </div>

                           {/* Right: Card */}
                           <div className="flex-1 pb-6 pl-2 min-w-0">
                               <div className="bg-[#f5f9ff] rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
                                   {/* Header */}
                                   <div className="bg-[#bae4fa] px-3 py-2 flex justify-between items-center">
                                       <span className="font-bold text-sm text-gray-800">{record.typeName}</span>
                                   </div>
                                   {/* Body */}
                                   <div className="p-3 text-xs space-y-1.5">
                                       {record.displayItems.map(item => (
                                           <div key={item.key} className="flex">
                                               <span className="text-gray-500 w-[90px] shrink-0 text-left pr-2">{item.label}:</span>
                                               <span className="text-gray-800 truncate flex-1">{item.value}</span>
                                           </div>
                                       ))}
                                       {/* Images if any */}
                                       {record.image && (
                                           <div className="mt-2 rounded-lg overflow-hidden h-28 w-full bg-gray-100 border border-gray-100">
                                               <img src={record.image} className="w-full h-full object-cover" alt="record"/>
                                           </div>
                                       )}
                                       {/* Creator Info */}
                                       <div className="pt-2 mt-2 border-t border-dashed border-gray-200 flex justify-end text-[10px] text-gray-400">
                                          {record.detail.created_by_user && record.detail.created_by_user.nickname && (
                                              <span className="truncate max-w-[100px]">{record.detail.created_by_user.nickname}</span>
                                          )}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       </div>
                     );
                   })
                 ) : (
                   <div className="flex flex-col items-center justify-center pt-10 pl-8 pr-4">
                       <img src="/nohistory.svg" alt="暂无记录" className="w-24 h-24 mb-2 opacity-60" />
                       <span className="text-gray-400 text-sm">暂无记录</span>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Center Column: Trend Chart */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-white relative rounded-md shadow-sm transition-all duration-300">
           {/* Toggle Buttons Container - Positioned relative to the chart container */}
           
           {/* Left Toggle Button (Centered) */}
           <button 
            onClick={handleToggleLeft}
             className={`absolute top-1/2 -translate-y-1/2 left-0 z-20 h-16 w-5 flex items-center justify-center rounded-r-xl bg-gray-200/50 hover:bg-gray-300/80 backdrop-blur-sm transition-all text-gray-500 hover:text-gray-800 shadow-sm border-r border-y border-white/50`}
             title={showLeftPanel ? "收起左侧栏" : "展开左侧栏"}
           >
             {showLeftPanel ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
           </button>

           {/* Right Toggle Button (Centered) */}
           <button 
            onClick={handleToggleRight}
             className={`absolute top-1/2 -translate-y-1/2 right-0 z-20 h-16 w-5 flex items-center justify-center rounded-l-xl bg-gray-200/50 hover:bg-gray-300/80 backdrop-blur-sm transition-all text-gray-500 hover:text-gray-800 shadow-sm border-l border-y border-white/50`}
             title={showRightPanel ? "收起右侧栏" : "展开右侧栏"}
           >
             {showRightPanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
           </button>

           {/* Chart Header with Title and DatePicker */}
           <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-2xl font-bold text-gray-900">趋势图</h2>
              <div className="w-[300px]">
                 <CustomDatePicker 
                   value={dateRange}
                   onChange={setDateRange}
                 />
              </div>
           </div>

           {/* Trend Chart Component */}
           <div className="flex-1 w-full min-h-0 z-10 relative">
              <div className="relative z-10 h-full">
                <TrendChart data={trendData} loading={trendLoading} />
              </div>
           </div>
        </div>

        {/* Right Column: Info & Staff */}
        <div 
          className={`relative rounded-md flex flex-col h-full bg-white shrink-0 p-5 overflow-y-auto custom-scrollbar shadow-sm transition-all duration-300 ease-in-out ${showRightPanel ? 'w-72 opacity-100' : 'w-0 opacity-0 p-0 border-none'}`}
        >
           {/* Staff Section */}
           <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">塘口人员</h3>
              <div className="grid grid-cols-4 gap-2">
                 {pond.groupInfo && pond.groupInfo.user_ids ? (
                   pond.groupInfo.user_ids.map((user) => (
                     <div key={user.id} className="flex flex-col items-center text-center group relative">
                        <div className="w-10 h-10 border border-gray-200 rounded-full overflow-hidden mb-1">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              {user.nickname.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate w-full">{user.nickname}</span>
                        <span className="text-[10px] text-gray-500 scale-90">
                          {getRoleName(user, pond.groupInfo!.group_owner_id)}
                        </span>
                        {/* Tooltip for phone number if needed, but not in user object currently */}
                     </div>
                   ))
                 ) : (
                   <div className="text-gray-400 text-sm col-span-4">暂无人员</div>
                 )}
              </div>
           </div>

           {/* Pond Info Section */}
           <div className="mb-8 flex-1">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">塘口信息</h3>
              <div className="space-y-3 text-sm">
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">名称 :</span>
                   <span className="text-gray-900 font-medium">{pond.name}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖品种 :</span>
                   <span className="text-gray-900 font-medium">{pond.breed_species}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">位置 :</span>
                   <span className="text-gray-900 font-medium">{pond.province}{pond.city}{pond.district}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖面积 :</span>
                   <span className="text-gray-900 font-medium">{pond.breed_area}亩</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">最大水深 :</span>
                   <span className="text-gray-900 font-medium">{pond.max_depth}米</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖方式 :</span>
                   <span className="text-gray-900 font-medium">{pond.breed_type}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">备注 :</span>
                   <span className="text-gray-900 font-medium">{pond.user_remark || '-'}</span>
                 </div>
              </div>
           </div>

           {/* Export Button */}
           <div className="mt-auto pt-4">
              <button onClick={handleExport} disabled={exporting} className={`w-full border rounded-lg py-2.5 font-bold transition-colors flex items-center justify-center gap-2 ${exporting ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-900 text-gray-900 hover:bg-gray-50'}`}>
                 {exporting ? '导出中...' : '数据导出'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PondDetail;
