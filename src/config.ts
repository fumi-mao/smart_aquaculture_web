export const API_BASE_URL = '/api/v1';
export const LOGIN_API_URL = '/api/v1/auth/login/apifox';

// 环境配置
export const ENV = 'dev'; // dev/test/prod

// 请求头默认配置
export const HEADERS = {
  'Content-Type': 'application/json',
  'X-Environment': ENV
};

export const DEFAULT_ASSETS = {
  POND_AVATAR: 'https://r3v334-yangyu.oss-cn-beijing.aliyuncs.com/uploads/2025/10/23/67d63325-1357-454e-b336-c317947d6642.jpg',
  USER_AVATAR: '/nopic.svg'
};
