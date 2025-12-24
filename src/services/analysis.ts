import api from './api';

export const getTimelineData = async (params: {
  pond_id: number;
  start_time?: string;
  end_time?: string;
  type?: string | string[];
}) => {
  const response = await api.post('/query/timeline', params);
  return response.data;
};

export const getAiAnalysisText = async (params: {
  pond_id: number;
  start_time: string;
  end_time: string;
  type: string | string[];
}) => {
  const response = await api.post('/statistics/analysis_text', params);
  return response.data;
};
