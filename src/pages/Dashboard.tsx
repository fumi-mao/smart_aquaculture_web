import { useEffect, useState } from 'react';
import { getPondList, getPondDetail, Pond } from '@/services/ponds';
import { getGroupsList } from '@/services/groups';
import { Loader2, MapPin, Fish, Clock, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. 尝试从缓存加载
    const cached = localStorage.getItem('cached_ponds_data');
    if (cached) {
      try {
        const { ponds: cachedPonds, timestamp } = JSON.parse(cached);
        // 如果缓存不过期（例如1小时），可以完全信任，这里简单起见，总是先显示缓存
        if (Array.isArray(cachedPonds)) {
          setPonds(cachedPonds);
          setLoading(false);
        }
      } catch (e) {
        console.warn('Failed to parse cached ponds', e);
      }
    }

    fetchPonds();
  }, []);

  const fetchAllGroups = async () => {
    try {
      // 1. Fetch page 1
      const res1: any = await getGroupsList({ page: 1, page_size: 50 });
      const data1 = res1?.data || res1;
      
      if (!data1) return [];
      
      let allGroups = Array.isArray(data1.groups) ? data1.groups : [];
      
      // 2. Determine total pages
      let totalPages = 1;
      if (data1.total_pages) {
          totalPages = data1.total_pages;
      } else if (data1.page_info?.total_pages) {
          totalPages = data1.page_info.total_pages;
      } else {
         // Fallback logic
         if (allGroups.length >= 50) totalPages = 2; // Assume at least one more page
      }

      // 3. Fetch remaining pages in parallel
      if (totalPages > 1) {
          const promises = [];
          // Safety limit MAX_PAGES to avoid too many requests
          const MAX_PAGES = 20; 
          const limit = Math.min(totalPages, MAX_PAGES);
          
          for (let p = 2; p <= limit; p++) {
              promises.push(getGroupsList({ page: p, page_size: 50 }));
          }
          
          const responses = await Promise.all(promises);
          responses.forEach((res: any) => {
              const data = res?.data || res;
              if (data && Array.isArray(data.groups)) {
                  allGroups = allGroups.concat(data.groups);
              }
          });
      }
      return allGroups;
    } catch (e) {
       console.warn('Failed to fetch groups:', e);
       return [];
    }
  };

  const getGroupPondsData = async () => {
    try {
      const groups = await fetchAllGroups();
      const pondIds = Array.from(new Set(groups.map((g: any) => g.pond_id).filter(Boolean)));
      
      if (pondIds.length === 0) return [];

      const tasks = pondIds.map(id => getPondDetail(id as number).then((r: any) => r?.data).catch(() => null));
      const results = await Promise.allSettled(tasks);
      
      const ponds: Pond[] = [];
      results.forEach(item => {
        if (item.status === 'fulfilled' && item.value) {
           ponds.push(item.value);
        }
      });
      return ponds;
    } catch (e) {
      console.warn('Failed to fetch group ponds:', e);
      return [];
    }
  };

  const fetchPonds = async () => {
    // 不再显示全局 loading，除非没有缓存
    const cached = localStorage.getItem('cached_ponds_data');
    if (!cached) setLoading(true);

    try {
      // 启动并行请求，但独立处理结果
      const pondListPromise = getPondList({ page: 1, page_size: 100 });
      const groupPondsPromise = getGroupPondsData();

      // 1. 处理自有塘口（通常较快）
      pondListPromise.then((res: any) => {
        let list: Pond[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        } else if (res && res.data && Array.isArray(res.data.list)) {
          list = res.data.list;
        } else if (res && res.data && Array.isArray(res.data.ponds)) {
          list = res.data.ponds;
        } else if (res && Array.isArray(res.list)) {
          list = res.list;
        } else if (res && Array.isArray(res.ponds)) {
          list = res.ponds;
        }
        
        setPonds(prev => {
          // 合并当前已有的（可能是缓存的）和新的自有塘口
          // 这里策略是：优先使用新的自有列表，保留已有的群组数据（如果有）
          // 但由于我们不知道哪些是群组数据，简单做法是：先显示自有数据，后续群组数据回来了再合并
          // 或者更稳妥：合并并去重
          const merged = [...prev, ...list];
          const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
          return unique;
        });
        
        // 至少有数据了，取消 loading
        setLoading(false);
      }).catch(err => console.error('Failed to fetch owned ponds', err));

      // 2. 处理群组塘口（较慢）
      groupPondsPromise.then((groupPonds) => {
        setPonds(prev => {
           const merged = [...prev, ...groupPonds];
           const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
           
           // 更新缓存
           localStorage.setItem('cached_ponds_data', JSON.stringify({
             timestamp: Date.now(),
             ponds: unique
           }));
           
           return unique;
        });
      }).catch(err => console.error('Failed to fetch group ponds', err));
      
      // 等待所有完成（可选，用于某些清理工作，这里不需要）
      await Promise.allSettled([pondListPromise, groupPondsPromise]);

    } catch (err) {
      console.error(err);
      if (!cached) setPonds([]); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar removed as requested */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 gap-8 shadow-sm z-10">
           <button className="h-full border-b-2 border-blue-500 text-blue-600 font-bold text-sm px-1">
             鱼塘({ponds.length})
           </button>
           <button className="h-full border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm px-1 font-medium transition-colors">
             数据导出
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
           {loading ? (
             <div className="flex justify-center py-20">
               <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
             </div>
           ) : (
             <div className="grid grid-cols-2 gap-6">
                {ponds.map(pond => (
                  <div key={pond.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => navigate(`/pond/${pond.id}`)}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{pond.name}</h3>
                      <div className="text-xs text-gray-500 flex flex-col items-end gap-1 font-medium">
                         <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 border border-gray-100">{pond.pond_spec || '规格未知'}</span>
                         <span className="text-gray-400">投放: {pond.fry_date || '-'}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-5 mb-4">
                      {/* Left: Pond Avatar */}
                      <div className="w-32 h-32 shrink-0 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                         {pond.picture_url ? (
                            <img src={pond.picture_url} alt={pond.name} className="w-full h-full object-cover" />
                         ) : (
                            <img src="/favicon.svg" alt={pond.name} className="w-full h-full object-cover p-4 opacity-50" />
                         )}
                      </div>
                      
                      {/* Right: Metrics */}
                      <div className="flex-1 flex flex-col justify-center py-1">
                         <div className="space-y-4">
                           <div>
                             <div className="flex justify-between text-xs mb-1.5">
                               <span className="text-gray-500 font-medium">pH</span>
                               <span className="text-gray-900 font-bold">7.8</span>
                             </div>
                             <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-red-400 w-3/4 rounded-full"></div>
                             </div>
                           </div>
                           <div>
                             <div className="flex justify-between text-xs mb-1.5">
                               <span className="text-gray-500 font-medium">亚盐</span>
                               <span className="text-gray-900 font-bold">0.02</span>
                             </div>
                             <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-yellow-400 w-1/4 rounded-full"></div>
                             </div>
                           </div>
                           <div>
                             <div className="flex justify-between text-xs mb-1.5">
                               <span className="text-gray-500 font-medium">氨氮</span>
                               <span className="text-gray-900 font-bold">0.05</span>
                             </div>
                             <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                               <div className="h-full bg-green-500 w-1/5 rounded-full"></div>
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
