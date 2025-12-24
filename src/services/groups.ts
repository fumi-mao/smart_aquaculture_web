import api from './api';

export const getGroupsList = async (params: any = {}) => {
  const response = await api.get('/groups/list', { params });
  return response.data;
};

export const getGroupInfo = async (groupId: number | string) => {
  const response = await api.get(`/groups`, { params: { group_id: groupId } });
  return response.data;
};
