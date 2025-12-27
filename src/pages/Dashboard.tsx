import { useEffect, useState } from 'react';
import { Pond, getRecentWaterQuality } from '@/services/ponds';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PondCard from '@/components/PondCard';
import { fetchDisplayPonds } from '@/utils/pondLoader';

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

  const fetchPonds = async () => {
    const cached = localStorage.getItem('cached_ponds_data');
    if (!cached) setLoading(true);

    try {
      const unique = await fetchDisplayPonds();
      
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
