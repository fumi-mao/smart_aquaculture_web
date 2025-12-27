import { getGroupsList } from '@/services/groups';

export const fetchAllGroups = async () => {
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

