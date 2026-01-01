import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Pond, getPondDetail, getBreedingRecords, getTrendData, getFeedTrendData } from '@/services/ponds';
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
import { downloadBinaryFile, downloadPagedElementsAsPdf } from '@/utils/download';
import { format as fmt } from 'date-fns';
import { DEFAULT_ASSETS } from '@/config';
import { readCachedPondDetail, writeCachedPondDetail } from '@/utils/pondLoader';

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
  const location = useLocation();
  const [pond, setPond] = useState<PondDetailInfo | null>(null);
  const [loadingPond, setLoadingPond] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingTrendPdf, setExportingTrendPdf] = useState(false);
  const trendExportRef = useRef<HTMLDivElement | null>(null);
  
  // Records State
  const [records, setRecords] = useState<FarmingRecord[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordHasMore, setRecordHasMore] = useState(true);
  const [recordLoading, setRecordLoading] = useState(false);
  
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

  // Fetch Records Helper
  const fetchRecords = async (page: number, isAppend: boolean = false) => {
    if (!id) return;
    try {
      setRecordLoading(true);
      const recordsRes = await getBreedingRecords(id, page);
      const rawList = recordsRes.data && Array.isArray(recordsRes.data) ? recordsRes.data : (Array.isArray(recordsRes) ? recordsRes : []);
      
      // If no more data
      if (rawList.length === 0) {
        setRecordHasMore(false);
        if (!isAppend) setRecords([]);
        return;
      }

      // Check if we got less than requested (assuming default page size is 10)
      if (rawList.length < 10) {
        setRecordHasMore(false);
      } else {
        setRecordHasMore(true);
      }

      const newRecords = rawList.map((item: any) => {
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
      });

      setRecords(prev => {
        const combined = isAppend ? [...prev, ...newRecords] : newRecords;
        // Re-sort all records by time descending
        return combined.sort((a: FarmingRecord, b: FarmingRecord) => {
             const timeA = new Date(a.rawTime || '').getTime();
             const timeB = new Date(b.rawTime || '').getTime();
             return timeB - timeA;
        });
      });
      setRecordPage(page);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setRecordLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setRecordPage(1);
    setRecordHasMore(true);
    fetchRecords(1, false);

    const statePond = (location.state as any)?.pond as Pond | undefined;
    if (statePond && String(statePond.id) === String(id)) {
      setPond((prev) => (prev ? prev : { ...statePond }));
    }

    const cachedDetail = readCachedPondDetail(id);
    if (cachedDetail && String(cachedDetail.id) === String(id)) {
      setPond((prev) => (prev ? { ...prev, ...cachedDetail } : { ...cachedDetail }));
    }

    setLoadingPond(true);
    const fetchData = async () => {
      try {
        const pondRes = await getPondDetail(id);
        const pondData = pondRes.data as Pond;
        if (cancelled) return;

        setPond((prev) => {
          if (!prev) return { ...pondData };
          return { ...prev, ...pondData };
        });
        writeCachedPondDetail(id, pondData);

        if (pondData.group_id) {
          getGroupInfo(pondData.group_id)
            .then((groupRes: any) => {
              if (cancelled) return;
              const groupData = groupRes?.data || null;
              setPond((prev) => {
                if (!prev) return prev;
                return { ...prev, groupInfo: groupData };
              });
            })
            .catch((e: any) => {
              if (cancelled) return;
              console.warn('Failed to fetch group info:', e);
            });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching pond details:', err);
      } finally {
        if (!cancelled) {
          setLoadingPond(false);
        }
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [id, location.state]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && !recordLoading && recordHasMore) {
      fetchRecords(recordPage + 1, true);
    }
  };

  // Helper to fetch all pages for trend data
  const fetchAllTrendData = async (params: any, fetchFn: Function) => {
    let allData: any[] = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100; // Use larger page size for trend data to reduce requests

    while (hasMore) {
      const res = await fetchFn({ ...params, page, page_size: pageSize });
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      
      if (data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
      
      // Safety break to prevent infinite loops in case of API issues
      if (page > 50) break;
    }
    return allData;
  };

  // Fetch Trend Data when id or dateRange changes
  useEffect(() => {
    if (id && dateRange.startDate && dateRange.endDate) {
      setTrendLoading(true);
      const fetchTrend = async () => {
        try {
          const commonParams = {
            start_time: format(dateRange.startDate, 'yyyy-MM-dd HH:mm:ss'),
            end_time: format(dateRange.endDate, 'yyyy-MM-dd HH:mm:ss'),
            pond_id: parseInt(id),
          };
          
          const [wqData, feedData] = await Promise.all([
            fetchAllTrendData({ ...commonParams, type: ['waterquality_data'] }, getTrendData),
            fetchAllTrendData(commonParams, getFeedTrendData)
          ]);
          
          setTrendData([...wqData, ...feedData]);
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

  /**
   * 文件名片段清洗
   * 作用：过滤 Windows/浏览器下载文件名中的非法字符，避免下载失败。
   * 输入：任意字符串
   * 输出：可用于文件名的安全字符串
   */
  const sanitizeFilenamePart = (input: string) => {
    return String(input || 'pond').replace(/[\\/:*?"<>|]/g, '_').trim() || 'pond';
  };

  const handleExportTrendPdf = async () => {
    if (!id) return;
    if (exportingTrendPdf) return;
    if (trendLoading) return;
    if (!trendData || trendData.length === 0) return;

    setExportingTrendPdf(true);
    /**
     * PDF 导出专用趋势图二次渲染容器
     * 作用：按 PDF 页面宽度重新渲染趋势图，让横轴刻度间距按导出宽度重新计算，避免裁切/重叠
     * 输入：trendData（趋势数据）、导出目标宽度（px）
     * 输出：离屏渲染后的图表节点列表（用于后续分页截图）
     */
    const exportHost = document.createElement('div');
    const exportRoot = createRoot(exportHost);
    try {
      // A4 纵向宽度约为 595.28pt，浏览器 96dpi 下换算为 px：pt * 96 / 72
      const exportWidthPx = Math.round((595.28 * 96) / 72);
      exportHost.style.position = 'fixed';
      exportHost.style.left = '-100000px';
      exportHost.style.top = '0';
      exportHost.style.width = `${exportWidthPx}px`;
      exportHost.style.backgroundColor = '#ffffff';
      exportHost.style.padding = '0';
      exportHost.style.margin = '0';
      exportHost.style.boxSizing = 'border-box';
      exportHost.style.pointerEvents = 'none';
      exportHost.style.zIndex = '-1';
      document.body.appendChild(exportHost);

      const name = sanitizeFilenamePart(pond?.name || 'pond');
      const start = dateRange?.startDate ? format(dateRange.startDate, 'yyyyMMdd') : 'start';
      const end = dateRange?.endDate ? format(dateRange.endDate, 'yyyyMMdd') : 'end';
      const ts = fmt(new Date(), 'yyyyMMdd_HHmm');
      const filename = `${name}_${id}_${start}-${end}_智能养殖报告_${ts}.pdf`;

      exportRoot.render(
        <div style={{ width: `${exportWidthPx}px`, padding: '0', margin: '0' }}>
          <TrendChart data={trendData} loading={false} exportMode exportWidthPx={exportWidthPx} />
        </div>
      );

      const waitForCharts = async () => {
        for (let i = 0; i < 30; i++) {
          const nodes = exportHost.querySelectorAll('[data-trend-export-item="true"]');
          const list = Array.from(nodes) as HTMLElement[];
          const ready = list.length > 0 && list.every((n) => (n.getBoundingClientRect().width || 0) > 0);
          if (ready) return list;
          await new Promise<void>((resolve) => setTimeout(resolve, 50));
        }
        return Array.from(exportHost.querySelectorAll('[data-trend-export-item="true"]')) as HTMLElement[];
      };

      const items = await waitForCharts();
      const startText = dateRange?.startDate ? format(dateRange.startDate, 'yyyy-MM-dd') : '--';
      const endText = dateRange?.endDate ? format(dateRange.endDate, 'yyyy-MM-dd') : '--';
      const reportNo = `${fmt(new Date(), 'yyyyMMddHHmmssSSS')}${String(id).padStart(4, '0')}`;
      await downloadPagedElementsAsPdf({
        elements: items,
        filename,
        orientation: 'portrait',
        format: 'a4',
        marginPt: 0,
        itemsPerPage: ({ pageIndex }) => (pageIndex === 0 ? 3 : 4),
        ignoreSelector: '[data-export-ignore="true"]',
        wrapperWidthPx: exportWidthPx,
        chartHeightPx: 0,
        watermarkText: '塘前燕数据验证中心',
        watermarkOpacity: 0.12,
        watermarkFontSizePx: 26,
        watermarkGapPx: 120,
        headerBuilder: ({ pageIndex, totalPages }) => {
          const header = document.createElement('div');
          header.style.display = 'flex';
          header.style.flexDirection = 'column';
          header.style.gap = '8px';
          header.style.padding = '14px 16px 10px 16px';
          header.style.borderBottom = '1px solid #e5e7eb';
          header.style.backgroundColor = '#ffffff';
          header.style.boxSizing = 'border-box';

          const topRow = document.createElement('div');
          topRow.style.display = 'flex';
          topRow.style.alignItems = 'center';
          topRow.style.justifyContent = 'space-between';
          topRow.style.gap = '10px';

          const brand = document.createElement('div');
          brand.style.display = 'flex';
          brand.style.alignItems = 'center';
          brand.style.gap = '10px';

          const logoWrap = document.createElement('div');
          logoWrap.style.width = '40px';
          logoWrap.style.height = '40px';
          logoWrap.style.borderRadius = '10px';
          logoWrap.style.backgroundColor = '#2563eb';
          logoWrap.style.display = 'flex';
          logoWrap.style.alignItems = 'center';
          logoWrap.style.justifyContent = 'center';

          const logo = document.createElement('img');
          logo.src = '/favicon.svg';
          logo.alt = 'logo';
          logo.style.width = '24px';
          logo.style.height = '24px';
          logo.style.display = 'block';

          const brandText = document.createElement('img');
          brandText.src = '/tangqianyan-text.svg';
          brandText.alt = '塘前燕';
          brandText.style.height = '22px';
          brandText.style.display = 'block';

          logoWrap.appendChild(logo);
          brand.appendChild(logoWrap);
          brand.appendChild(brandText);

          const meta = document.createElement('div');
          meta.style.display = 'flex';
          meta.style.flexDirection = 'column';
          meta.style.alignItems = 'flex-end';
          meta.style.gap = '2px';
          meta.style.fontSize = '13px';
          meta.style.color = '#374151';

          const range = document.createElement('div');
          range.textContent = `${startText} ~ ${endText}`;
          range.style.fontWeight = '600';

          const no = document.createElement('div');
          no.textContent = `报告编号：${reportNo}  |  第${pageIndex + 1}/${totalPages}页`;

          meta.appendChild(range);
          meta.appendChild(no);

          topRow.appendChild(brand);
          topRow.appendChild(meta);

          const title = document.createElement('div');
          title.textContent = '智能养殖报告';
          title.style.fontSize = '32px';
          title.style.fontWeight = '800';
          title.style.color = '#111827';
          title.style.textAlign = 'center';
          title.style.marginTop = '2px';

          header.appendChild(topRow);
          header.appendChild(title);

          if (pageIndex === 0) {
            const blockTitle = document.createElement('div');
            blockTitle.textContent = '基本信息';
            blockTitle.style.fontSize = '16px';
            blockTitle.style.fontWeight = '800';
            blockTitle.style.color = '#111827';
            blockTitle.style.marginTop = '4px';

            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.tableLayout = 'fixed';
            table.style.fontSize = '14px';
            table.style.color = '#111827';

            const makeRow = (l1: string, v1: string, l2: string, v2: string) => {
              const tr = document.createElement('tr');
              const cells = [
                { text: l1, isLabel: true },
                { text: v1, isLabel: false },
                { text: l2, isLabel: true },
                { text: v2, isLabel: false },
              ];
              cells.forEach((c) => {
                const td = document.createElement('td');
                td.textContent = c.text || '-';
                td.style.border = '1px solid #d1d5db';
                td.style.padding = '9px 12px';
                td.style.verticalAlign = 'middle';
                td.style.wordBreak = 'break-all';
                if (c.isLabel) {
                  td.style.width = '14%';
                  td.style.backgroundColor = '#f9fafb';
                  td.style.color = '#374151';
                  td.style.fontWeight = '700';
                } else {
                  td.style.width = '36%';
                  td.style.fontWeight = '600';
                }
                tr.appendChild(td);
              });
              return tr;
            };

            const exportAt = fmt(new Date(), 'yyyy-MM-dd HH:mm');
            const locationText = `${pond?.province || ''}${pond?.city || ''}${pond?.district || ''}` || '-';
            const members = Array.isArray(pond?.groupInfo?.user_ids) ? pond.groupInfo!.user_ids : [];
            const memberText =
              members
                .map((u) => String(u?.nickname || '').trim())
                .filter(Boolean)
                .join('、') || '-';

            table.appendChild(makeRow('塘口名称', pond?.name || '-', '塘口成员', memberText));
            table.appendChild(makeRow('养殖品种', pond?.breed_species || '-', '养殖方式', pond?.breed_type || '-'));
            table.appendChild(makeRow('地理位置', locationText, '养殖面积', pond?.breed_area != null ? `${pond.breed_area}亩` : '-'));
            table.appendChild(makeRow('最大水深', pond?.max_depth != null ? `${pond.max_depth}米` : '-', '导出时间', exportAt));

            header.appendChild(blockTitle);
            header.appendChild(table);
          }

          return header;
        },
      });
    } finally {
      try {
        exportRoot.unmount();
      } catch {
        // ignore
      }
      try {
        exportHost.remove();
      } catch {
        // ignore
      }
      setExportingTrendPdf(false);
    }
  };

  if (!pond) return <div className="flex h-full items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden gap-3">
      {/* Top Header Row (Back) */}
      <div className="h-12 bg-white rounded-md flex items-center px-4 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors" onClick={() => navigate('/')}>
           <ChevronLeft size={20} />
           <span className="font-bold text-lg">{pond.name || (loadingPond ? '加载中...' : '塘口详情')}</span>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-3">
        {/* Left Column: Farming Records (Timeline) */}
        <div 
          className={`relative rounded-md flex flex-col h-full bg-white shrink-0 shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${showLeftPanel ? 'w-[400px] opacity-100' : 'w-0 opacity-0 border-none'}`}
        >
           {/* Pond Avatar Area */}
           <div className="p-4 border-b border-gray-100 flex flex-col items-center">
             {/* 
                  Action: Modify style
                  Reason: Change avatar back to circle shape (rounded-full) as per user request
              */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 mb-2 shadow-sm">
               <img
                 src={pond.picture_url || DEFAULT_ASSETS.POND_AVATAR}
                 alt={pond.name}
                 className="w-full h-full object-cover"
               />
             </div>
             {/* 
                 Action: Remove element
                 Reason: Hide pond name below avatar as per requirements
                 <h3 className="font-bold text-gray-900">{pond.name}</h3>
             */}
           </div>

           <div className="p-4 pb-2">
             <h3 className="font-bold text-gray-900 text-lg">养殖记录</h3>
           </div>
           <div 
             className="flex-1 overflow-y-auto p-4 custom-scrollbar"
             onScroll={handleScroll}
           >
              <div className="relative">
                 {records && records.length > 0 ? (
                   records.map((record, index) => {
                     const iconSrc = getRecordIcon(record.type);
                     return (
                       <div key={record.id} className="flex relative min-h-[120px] mb-2 group">
                           {/* Left: Time */}
                           {/* 
                               Action: Modify layout
                               Reason: Center time vertically relative to the card.
                                       Added justify-center to vertically align content.
                                       Added pb-6 to match the right column's padding, ensuring alignment with the card body.
                                       Removed pt-1.
                           */}
                           <div className="w-16 flex flex-col items-end justify-center pr-2 text-right shrink-0 pb-6">
                               <span className="text-lg font-bold text-gray-800 leading-none">{record.time}</span>
                               <span className="text-xs text-gray-400 mt-1">{record.date}</span>
                           </div>

                           {/* Center: Timeline */}
                           <div className="w-10 flex flex-col items-center relative shrink-0">
                               {/* Line Top (only if not first) */}
                               {/* 
                                   Action: Modify line logic
                                   Reason: Prevent line from overlapping with the icon. 
                                   Start line from bottom of icon (top-8) to bottom of container.
                                   Do not render line for the last item.
                               */}
                               {index !== (records.length || 0) - 1 && (
                                   <div className="w-[2px] bg-gray-200 absolute left-1/2 -translate-x-1/2 top-8 bottom-0"></div>
                               )}
                               
                               {/* Icon Node */}
                               {/* 
                                   Action: Modify style
                                   Reason: Remove outer circle border/bg as the icon itself now includes a circle.
                                           Increased image size to w-8 h-8 to fill the space.
                               */}
                               <div className="w-8 h-8 flex items-center justify-center z-10 relative mt-0">
                                   <img src={iconSrc} alt={record.type} className="w-8 h-8 object-contain" />
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
                 {recordLoading && (
                   <div className="py-4 text-center text-gray-400 text-sm">加载中...</div>
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

           <div
             ref={trendExportRef}
             id={`trend-export-${id || 'unknown'}`}
             className="flex flex-col flex-1 min-h-0"
           >
             {/* Chart Header with Title and DatePicker */}
             <div className="flex justify-end items-center mb-6 z-10 relative">
                <h2 className="text-2xl font-bold text-gray-900 absolute left-1/2 -translate-x-1/2">水质趋势图</h2>
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
                          <img
                            src={user.avatar_url || DEFAULT_ASSETS.USER_AVATAR}
                            alt={user.nickname}
                            className="w-full h-full object-cover"
                          />
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
              <button
                onClick={handleExportTrendPdf}
                disabled={exportingTrendPdf || trendLoading || !trendData || trendData.length === 0}
                className={`w-full border rounded-lg py-2.5 font-bold transition-colors flex items-center justify-center gap-2 mb-2 ${
                  exportingTrendPdf || trendLoading || !trendData || trendData.length === 0
                    ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                 {exportingTrendPdf ? '生成中...' : '报告导出'}
              </button>
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
