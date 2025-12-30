/**
 * 全局配置文件
 * 修改 ENV 变量以切换环境 (dev/test/prod)
 */

// ================= 环境配置 =================
export const ENV: 'dev' | 'test' | 'prod' = 'dev'; // 当前环境

// ================= 服务器配置 =================
export const API_BASE_URL = '/api/v1';
export const LOGIN_API_URL = '/api/v1/auth/login/apifox'; // 暂未使用

// ================= 请求头配置 =================
export const HEADERS = {
  'Content-Type': 'application/json',
  'X-Environment': ENV // 动态注入环境标识
};

// ================= 资源配置 =================
export const DEFAULT_ASSETS = {
  POND_AVATAR: 'https://r3v334-yangyu.oss-cn-beijing.aliyuncs.com/uploads/2025/10/23/67d63325-1357-454e-b336-c317947d6642.jpg',
  USER_AVATAR: '/nopic.svg'
};
