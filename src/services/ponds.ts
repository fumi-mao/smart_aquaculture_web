import api from './api';

export interface Pond {
  id: number;
  name: string;
  breed_area: number;
  max_depth: number;
  breed_type: string;
  breed_species: string;
  province: string;
  city: string;
  district: string;
  longitude: number;
  latitude: number;
  user_remark: string;
  picture_url: string;
  created_at: string;
  updated_at: string;
  group_id: number;
  is_demo: boolean;
}

export const getPondList = async (params: any = {}) => {
  const response = await api.get('/ponds', { params });
  return response.data;
};

export const getPondDetail = async (id: string | number) => {
  const response = await api.get(`/ponds/${id}`);
  return response.data;
};

export const getBreedingRecords = async (pondId: number | string, page: number = 1) => {
  const response = await api.post('/query/timeline', {
    pond_id: typeof pondId === 'string' ? parseInt(pondId) : pondId,
    page
  });
  return response.data;
};

/**
 * 获取趋势图数据
 * @param params 查询参数
 * @returns 趋势图数据
 */
export const getTrendData = async (params: {
  start_time: string;
  end_time: string;
  pond_id: number;
  type: string[];
  page?: number;
  page_size?: number;
}) => {
  const response = await api.post('/query/timeline', params);
  return response.data;
};

/**
 * 获取投料趋势数据
 * @param params 查询参数
 * @returns 投料数据
 */
export const getFeedTrendData = async (params: {
  start_time: string;
  end_time: string;
  pond_id: number;
  page?: number;
  page_size?: number;
}) => {
  const response = await api.post('/query/timeline', {
    ...params,
    type: ['feed_data']
  });
  return response.data;
};

/**
 * 获取最近的水质记录
 * @param pondId 塘口ID
 * @param limit 获取条数，默认为2
 * @returns 水质记录列表
 */
export const getRecentWaterQuality = async (pondId: number | string, limit: number = 2) => {
  const response = await api.post('/query/timeline', {
    pond_id: typeof pondId === 'string' ? parseInt(pondId) : pondId,
    type: ['waterquality_data'],
    page: 1,
    page_size: limit
  });
  return response.data;
};

/**
 * 获取指定时间范围内的水质记录（用于首页卡片趋势预览）
 * @param params 查询参数
 * @returns 水质记录列表
 */
export const getWaterQualityByTimeRange = async (params: {
  pond_id: number;
  start_time: string;
  end_time: string;
  page?: number;
  page_size?: number;
}) => {
  const response = await api.post('/query/timeline', {
    ...params,
    type: ['waterquality_data'],
  });
  return response.data;
};
