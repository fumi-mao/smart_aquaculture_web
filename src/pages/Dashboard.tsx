import { useEffect, useState } from 'react';
import { getPondList, getPondDetail, Pond, getRecentWaterQuality } from '@/services/ponds';
import { getGroupsList } from '@/services/groups';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PondCard from '@/components/PondCard';

/**
 * 仪表盘页面 (Dashboard)
 * 作用：展示用户所有的塘口列表及概览信息，作为应用的主页。
 * 输入：无 (自动获取用户塘口数据)
 * 输出：塘口列表 UI
 * 逻辑：
 *  1. 尝试从本地缓存加载塘口数据 (localStorage)
 *  2. 获取所有群组及关联的塘口数据 (fetchPonds, getGroupPondsData)
 *  3. 合并自有塘口和群组塘口，去重并排序
 *  4. 并发获取所有塘口的最近水质数据 (fetchAllWaterQuality)
 *  5. 渲染塘口卡片列表 (PondCard)
 * 样式：
 *  - 网格布局显示卡片 grid-cols-1 md:grid-cols-2
 *  - 透明背景 bg-transparent (融入整体布局)
 */
const Dashboard = () => {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  // 存储所有塘口的水质数据，key为pondId
  const [waterQualityData, setWaterQualityData] = useState<Record<number, any[]>>({});
  const [loadingWaterQuality, setLoadingWaterQuality] = useState(false);
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
          // 缓存加载后也需要去获取最新的水质数据
          fetchAllWaterQuality(cachedPonds);
        }
      } catch (e) {
        console.warn('Failed to parse cached ponds', e);
      }
    }

    fetchPonds();
  }, []);

  // 并发获取所有塘口的水质数据
  const fetchAllWaterQuality = async (pondList: Pond[]) => {
    if (!pondList || pondList.length === 0) return;
    
    setLoadingWaterQuality(true);
    try {
      // 创建并发请求任务
      const tasks = pondList.map(pond => 
        getRecentWaterQuality(pond.id, 2)
          .then(res => ({ id: pond.id, data: res.data || [] }))
          .catch(err => {
            console.warn(`Failed to fetch water quality for pond ${pond.id}`, err);
            return { id: pond.id, data: [] };
          })
      );

      // 等待所有请求完成 (Promise.all 实现并发)
      const results = await Promise.all(tasks);
      
      // 整理结果到 Map
      const newData: Record<number, any[]> = {};
      results.forEach(item => {
        newData[item.id] = item.data;
      });
      
      setWaterQualityData(prev => ({ ...prev, ...newData }));
    } catch (err) {
      console.error('Error fetching water quality data', err);
    } finally {
      setLoadingWaterQuality(false);
    }
  };

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

      // 获取完塘口列表后，立即并发获取水质数据
      fetchAllWaterQuality(unique);

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
                <PondCard 
                  key={pond.id} 
                  pond={pond} 
                  waterQualityData={waterQualityData[pond.id]}
                  loadingData={loadingWaterQuality && !waterQualityData[pond.id]} 
                />
              ))}
           </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
