import api from './api';

export interface GroupUser {
  id: number;
  nickname: string;
  avatar_url: string;
  admin: boolean;
}

export interface GroupInfo {
  id: number;
  pond_id: number;
  group_name: string;
  group_desc: string;
  group_avatar: string;
  group_num: number;
  group_owner_id: number;
  user_ids: GroupUser[];
  created_at: string;
  updated_at: string;
}

export const getGroupsList = async (params: any = {}) => {
  const response = await api.get('/groups/list', { params });
  return response.data;
};

export const getGroupInfo = async (groupId: number | string) => {
  const response = await api.get('/groups', { params: { group_id: groupId } });
  return response.data;
};
