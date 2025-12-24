import axios from 'axios';
import { API_BASE_URL, HEADERS } from '@/config';
import { useUserStore } from '@/store/useUserStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: HEADERS,
});

api.interceptors.request.use((config) => {
  const token = useUserStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useUserStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
