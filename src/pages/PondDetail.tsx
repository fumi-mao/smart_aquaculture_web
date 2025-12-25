import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Pond, getPondDetail } from '@/services/ponds';
import { GroupInfo, getGroupInfo, GroupUser } from '@/services/groups';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// FarmingRecord interface for the timeline (keeping it for structure, though data might be empty)
interface FarmingRecord {
  id: number;
  time: string;
  date: string;
  image?: string;
}

// Extend Pond to include extra info needed for the view
interface PondDetailInfo extends Pond {
  records?: FarmingRecord[];
  groupInfo?: GroupInfo;
}

const PondDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pond, setPond] = useState<PondDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);

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
           
           setPond({
             ...pondData,
             records: [], // Placeholder as no API provided for records in this task
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

  const getRoleName = (user: GroupUser, ownerId: number) => {
    if (user.id === ownerId) return '创建者';
    if (user.admin) return '管理员';
    return '观众';
  };

  if (loading || !pond) return <div className="flex h-full items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      {/* Top Header Row (Back) */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors" onClick={() => navigate('/')}>
           <ChevronLeft size={20} />
           <span className="font-bold text-lg">{pond.name}</span>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Farming Records (Timeline) */}
        <div className="w-72 border-r border-gray-200 flex flex-col h-full bg-white shrink-0">
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
              <div className="relative pl-2">
                 {/* Vertical Line */}
                 <div className="absolute left-[9px] top-2 bottom-0 w-[2px] bg-gray-300"></div>
                 
                 {pond.records && pond.records.length > 0 ? (
                   pond.records.map((record) => (
                   <div key={record.id} className="relative pl-8 mb-8 group">
                     {/* Circle Node */}
                     <div className="absolute left-0 top-0 w-5 h-5 bg-white border-2 border-gray-800 rounded-full z-10 box-border"></div>
                     
                     {/* Time & Date */}
                     <div className="text-sm font-medium text-gray-800 mb-1 leading-tight">
                       <div>{record.time}</div>
                       <div>{record.date}</div>
                     </div>
                     
                     {/* Content Card (Image) */}
                     <div className="mt-2 w-full h-28 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        {record.image ? (
                          <img src={record.image} alt="record" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">暂无图片</div>
                        )}
                     </div>
                   </div>
                   ))
                 ) : (
                   <div className="text-gray-400 text-sm pl-8">暂无记录</div>
                 )}
              </div>
           </div>
        </div>

        {/* Center Column: Trend Chart */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-blue-50/30 relative">
           {/* Chart Title Overlay */}
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
              <span className="text-9xl font-black text-gray-900 tracking-widest" style={{ writingMode: 'horizontal-tb' }}>趋势图</span>
           </div>

           <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-2xl font-bold text-gray-900">趋势图</h2>
           </div>

           <div className="flex-1 w-full min-h-0 z-10">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} dy={10} />
                 <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} />
                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                 />
                 <Line yAxisId="left" type="monotone" dataKey="pH" stroke="#ef4444" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                 <Line yAxisId="left" type="monotone" dataKey="do" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                 <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Right Column: Info & Staff */}
        <div className="w-72 border-l border-gray-200 flex flex-col h-full bg-white shrink-0 p-5 overflow-y-auto custom-scrollbar">
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
              <button className="w-full border border-gray-900 text-gray-900 rounded-lg py-2.5 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                 数据导出
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PondDetail;
