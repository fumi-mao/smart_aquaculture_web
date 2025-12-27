import { getPondList, getPondDetail, Pond } from '@/services/ponds';
import { fetchAllGroups } from './groupsLoader';

/**
 * 获取用于展示的塘口列表
 * 逻辑与首页 Dashboard 完全一致：
 * 1. 获取我创建/拥有的塘口 (getPondList)
 * 2. 获取我加入的塘口 (通过 groups -> pond_id -> getPondDetail)
 * 3. 合并并去重，只保留有效塘口
 * 
 * @returns Promise<Pond[]> 最终展示的塘口列表
 */
export const fetchDisplayPonds = async (): Promise<Pond[]> => {
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

    // 去重
    let unique = Array.from(new Map(newPonds.map(item => [item.id, item])).values());
    
    // 排序：示例鱼塘置顶
    unique.sort((a, b) => {
      if (a.is_demo && !b.is_demo) return -1;
      if (!a.is_demo && b.is_demo) return 1;
      return 0;
    });
    
    return unique;

  } catch (err) {
    console.error('fetchDisplayPonds error:', err);
    return [];
  }
};

const getGroupPondsData = async () => {
  try {
    const groups = await fetchAllGroups();
    const pondIds = Array.from(new Set(groups.map((g: any) => g.pond_id).filter(Boolean)));
    
    if (pondIds.length === 0) return [];

    // 并发获取详情，如果获取失败（如无权限/已退出），则返回 null
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
