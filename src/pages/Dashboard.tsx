import { useEffect, useState } from 'react';
import { getPondList, getPondDetail, Pond } from '@/services/ponds';
import { getGroupsList } from '@/services/groups';
import { Loader2, Fish, ArrowDownToLine, Maximize2, Droplets, Thermometer, Activity } from 'lucide-react';
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
        const { ponds: cachedPonds } = JSON.parse(cached);
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
      const res1: any = await getGroupsList({ page: 1, page_size: 50 });
      const data1 = res1?.data || res1;
      
      if (!data1) return [];
      
      let allGroups = Array.isArray(data1.groups) ? data1.groups : [];
      
      let totalPages = 1;
      if (data1.total_pages) {
          totalPages = data1.total_pages;
      } else if (data1.page_info?.total_pages) {
          totalPages = data1.page_info.total_pages;
      } else {
         if (allGroups.length >= 50) totalPages = 2;
      }

      if (totalPages > 1) {
          const promises = [];
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
    const cached = localStorage.getItem('cached_ponds_data');
    if (!cached) setLoading(true);

    try {
      const pondListPromise = getPondList({ page: 1, page_size: 100 });
      const groupPondsPromise = getGroupPondsData();

      const [pondListResult, groupPondsResult] = await Promise.allSettled([pondListPromise, groupPondsPromise]);
      
      let newPonds: Pond[] = [];
      
      if (pondListResult.status === 'fulfilled') {
        const res = pondListResult.value;
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
        newPonds = [...newPonds, ...list];
      } else {
        console.error('Failed to fetch owned ponds', pondListResult.reason);
      }

      if (groupPondsResult.status === 'fulfilled') {
        const groupPonds = groupPondsResult.value;
        if (Array.isArray(groupPonds)) {
             newPonds = [...newPonds, ...groupPonds];
        }
      } else {
         console.error('Failed to fetch group ponds', groupPondsResult.reason);
      }

      let unique = Array.from(new Map(newPonds.map(item => [item.id, item])).values());
      
      unique.sort((a, b) => {
        if (a.is_demo && !b.is_demo) return -1;
        if (!a.is_demo && b.is_demo) return 1;
        return 0;
      });
      
      setPonds(unique);
      
      localStorage.setItem('cached_ponds_data', JSON.stringify({
         timestamp: Date.now(),
         ponds: unique
      }));

    } catch (err) {
      console.error(err);
      if (!cached) setPonds([]); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-none px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">我的鱼塘</h1>
        <p className="text-gray-500 text-sm mt-1">管理和监控您的所有养殖塘口状态</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
         {loading ? (
           <div className="flex justify-center py-20">
             <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ponds.map(pond => (
                <div 
                  key={pond.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col" 
                  onClick={() => navigate(`/pond/${pond.id}`)}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-xl truncate pr-2">{pond.name}</h3>
                    {pond.is_demo && (
                      <span className="px-2 py-0.5 text-xs border border-gray-300 rounded text-gray-500 shrink-0">
                        示例
                      </span>
                    )}
                  </div>
                  
                  {/* Card Body */}
                  <div className="flex p-4 gap-4">
                    {/* Pond Image */}
                    <div className="w-32 h-32 shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                       {pond.picture_url ? (
                          <img src={pond.picture_url} alt={pond.name} className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <img src="/favicon.svg" alt={pond.name} className="w-12 h-12 opacity-20" />
                          </div>
                       )}
                    </div>
                    
                    {/* Metrics (Simulated Charts) */}
                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 gap-2">
                        {/* pH */}
                        <div>
                           <div className="flex justify-between text-xs text-gray-500 mb-1">
                             <span className="font-medium">pH</span>
                             <span className="font-bold text-gray-900">7.8</span>
                           </div>
                           <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-400 w-3/4 rounded-full"></div>
                           </div>
                        </div>
                        {/* Nitrite */}
                        <div>
                           <div className="flex justify-between text-xs text-gray-500 mb-1">
                             <span className="font-medium">亚盐</span>
                             <span className="font-bold text-gray-900">0.02</span>
                           </div>
                           <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                               <div className="h-full bg-red-400 w-1/4 rounded-full"></div>
                           </div>
                        </div>
                        {/* Ammonia */}
                        <div>
                           <div className="flex justify-between text-xs text-gray-500 mb-1">
                             <span className="font-medium">氨氮</span>
                             <span className="font-bold text-gray-900">0.05</span>
                           </div>
                           <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                               <div className="h-full bg-teal-500 w-1/5 rounded-full"></div>
                           </div>
                        </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="grid grid-cols-3 border-t border-gray-100 text-xs text-gray-600 divide-x divide-gray-100 bg-gray-50/50">
                     <div className="p-3 text-center truncate flex flex-col items-center justify-center gap-1">
                        <span className="text-gray-400 scale-90">塘口面积</span>
                        <span className="font-bold text-gray-900 text-sm">{pond.breed_area ? `${pond.breed_area}亩` : '-'}</span>
                     </div>
                     <div className="p-3 text-center truncate flex flex-col items-center justify-center gap-1">
                        <span className="text-gray-400 scale-90">最大水深</span>
                        <span className="font-bold text-gray-900 text-sm">{pond.max_depth ? `${pond.max_depth}m` : '-'}</span>
                     </div>
                     <div className="p-3 text-center truncate flex flex-col items-center justify-center gap-1">
                        <span className="text-gray-400 scale-90">养殖品种</span>
                        <span className="font-bold text-gray-900 text-sm truncate w-full px-1">{pond.breed_species || '-'}</span>
                     </div>
                  </div>

                </div>
              ))}
           </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
