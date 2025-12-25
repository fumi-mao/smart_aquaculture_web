import api from './api';

export interface UserInfo {
  id: number;
  openid: string;
  nickname: string;
  avatar_url: string;
  phone: string;
  picture_url: string;
  created_at: string;
  updated_at: string;
}

export const getUserInfo = async (userId: number | string) => {
  // query param user_id
  const response = await api.get(`/users/people?user_id=${userId}`);
  return response.data;
};
