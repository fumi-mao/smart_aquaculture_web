import api from './api';

export interface Pond {
  id: number;
  name: string;
  breed_area: number;
  max_depth: number;
  breed_type: string;
  breed_species: string;
  pond_spec?: string;
  fry_date?: string;
  picture_url?: string;
  is_demo?: boolean;
}

export const getPondList = async (params: any = {}) => {
  const response = await api.get('/ponds', { params });
  return response.data;
};

export const getPondDetail = async (id: string | number) => {
  const response = await api.get(`/ponds/${id}`);
  return response.data;
};
