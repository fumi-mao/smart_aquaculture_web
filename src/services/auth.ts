import api from './api';

export interface LoginResponse {
  data: {
    token: string;
    user_id: number;
    nickname: string;
    avatar_url?: string;
  };
  message: string;
}

export const login = async (openid: string): Promise<LoginResponse> => {
  const response = await api.post('/auth/login/apifox', { openid });
  return response.data;
};
