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

export interface SmsResponse {
  message: string;
}

/**
 * 发送短信验证码
 * @param phone 手机号
 * @returns Promise<SmsResponse>
 */
export const sendSms = async (phone: string): Promise<SmsResponse> => {
  // 使用 baseURL: '/' 覆盖默认的 /api/v1，使请求路径为 /oauth/sms/send
  // 配合 vite.config.ts 中的 proxy 代理 /oauth 到后端
  const response = await api.post('/oauth/sms/send', { phone }, { baseURL: '/' });
  return response.data;
};

/**
 * 手机号验证码登录
 * @param phone 手机号
 * @param code 验证码
 * @returns Promise<LoginResponse>
 */
export const loginByPhone = async (phone: string, code: string): Promise<LoginResponse> => {
  // 默认 baseURL 为 /api/v1，请求路径拼接为 /api/v1/auth/login/sms
  const response = await api.post('/auth/login/sms', { phone, code });
  return response.data;
};
