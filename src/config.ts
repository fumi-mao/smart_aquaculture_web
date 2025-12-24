export const API_BASE_URL = '/api/v1';
export const LOGIN_API_URL = '/api/v1/auth/login/apifox';

// 环境配置
export const ENV = 'dev'; // dev/test/prod

// 请求头默认配置
export const HEADERS = {
  'Content-Type': 'application/json',
  'X-Environment': ENV
};
