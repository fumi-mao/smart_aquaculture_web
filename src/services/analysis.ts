import api from './api';

const extractTextFromResponse = (payload: any) => {
  if (!payload) return '';
  if (typeof payload?.text === 'string') return payload.text;
  if (typeof payload?.data?.text === 'string') return payload.data.text;
  return '';
};

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
  is_demo?: boolean;
}) => {
  const endpoint = params.is_demo ? '/statistics/analysis_text_demo' : '/statistics/analysis_text';
  const typeArr = Array.isArray(params.type) ? params.type : [params.type];
  const response = await api.post(endpoint, {
    pond_id: params.pond_id,
    start_time: params.start_time,
    end_time: params.end_time,
    type: typeArr,
  });
  return {
    raw: response.data,
    text: extractTextFromResponse(response.data),
  };
};

export const getAnalysisItem = async (params: {
  type: string;
  uuid: string;
  is_demo?: boolean;
}) => {
  const endpoint = params.is_demo ? '/statistics/analysis_item_demo' : '/statistics/analysis_item';
  const response = await api.get(endpoint, { params: { type: params.type, uuid: params.uuid } });
  return {
    raw: response.data,
    text: extractTextFromResponse(response.data),
  };
};
