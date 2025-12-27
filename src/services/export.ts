import api from './api';

export const DEFAULT_EXPORT_TYPES = [
  'feed_data',
  'waterquality_data',
  'loss_data',
  'aquacultureinputs_data',
  'pond_patrol_data',
  'sample_data',
  'outfishpond_data',
  'seed_data',
  'physical_operation_data',
  'general_record_data'
];

export const startExport = async (params: {
  type: string[];
  pond_id: number;
  start_time: string;
  end_time: string;
}) => {
  const res = await api.post('/export/start', params);
  return res.data;
};

export const downloadExport = async (jobId: string) => {
  const res = await api.get(`/export/download/${jobId}`, { responseType: 'arraybuffer' });
  return res;
};
