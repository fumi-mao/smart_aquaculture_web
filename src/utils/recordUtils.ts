
import { 
  Fish, 
  Utensils, 
  Droplets, 
  Eye, 
  AlertTriangle, 
  LogOut, 
  Package, 
  Activity, 
  Wrench, 
  FileText 
} from 'lucide-react';

// Define record types for type safety
export type RecordType = 
  | 'seed' 
  | 'feeding' 
  | 'waterquality' 
  | 'patrol' 
  | 'lossing' 
  | 'outfishpond' 
  | 'aquacultureinputs' 
  | 'sampledata' 
  | 'physical_operation' 
  | 'general_record'
  | 'unknown';

interface RecordConfig {
  name: string;
  icon: any; // Lucide icon component
  api_type: string;
  timeField: string;
}

interface FieldConfig {
  key: string;
  label: string;
  unit?: string;
}

// Map record types to local SVG paths
export const RECORD_ICONS: Record<string, string> = {
  seed: '/record_type/breed-seed-b.svg',
  feeding: '/record_type/breed-feed-b.svg',
  feed: '/record_type/breed-feed-b.svg',
  waterquality: '/record_type/breed-waterquality-b.svg',
  patrol: '/record_type/breed-pond_patrol-b.svg',
  lossing: '/record_type/breed-loss-b.svg',
  outfishpond: '/record_type/breed-outpond-b.svg',
  aquacultureinputs: '/record_type/breed-aquacultureinputs-b.svg',
  sampledata: '/record_type/breed-sample-b.svg',
  physical_operation: '/record_type/breed-physical_opration-b.svg', // Note typo in filename
  general_record: '/record_type/breed-general_recoed-b.svg', // Note typo in filename
  unknown: '/record_type/breed-general_recoed-b.svg'
};

export const RECORD_TYPE_MAP: Record<string, string> = {
  feed_data: 'feeding',
  feeding: 'feeding',
  aquacultureinputs: 'aquacultureinputs',
  aquacultureinputs_data: 'aquacultureinputs',
  water_quality: 'waterquality',
  waterquality: 'waterquality',
  waterquality_data: 'waterquality',
  patrol: 'patrol',
  pond_patrol_data: 'patrol',
  loss: 'lossing',
  lossing: 'lossing',
  loss_data: 'lossing',
  sampledata: 'sampledata',
  sample: 'sampledata',
  sample_data: 'sampledata',
  physics: 'physical_operation',
  physical_operation_data: 'physical_operation',
  physicaloperation: 'physical_operation',
  general_record: 'general_record',
  general_record_data: 'general_record',
  general: 'general_record',
  seeddata: 'seed',
  seed_data: 'seed',
  outfishpond: 'outfishpond',
  outfishpond_data: 'outfishpond',
  outpond: 'outfishpond'
};

export const recordTypeConfig: Record<string, RecordConfig> = {
  seed: { name: '苗种投放', icon: null, api_type: 'seed', timeField: 'operate_at' },
  feeding: { name: '饲料投喂', icon: null, api_type: 'feeding', timeField: 'operate_at' },
  feed: { name: '饲料投喂', icon: null, api_type: 'feeding', timeField: 'operate_at' }, // Alias
  waterquality: { name: '水质监测', icon: null, api_type: 'waterquality', timeField: 'operate_at' },
  patrol: { name: '巡塘记录', icon: null, api_type: 'patrol', timeField: 'operate_at' },
  lossing: { name: '损失记录', icon: null, api_type: 'lossing', timeField: 'operate_at' },
  outfishpond: { name: '出塘记录', icon: null, api_type: 'outfishpond', timeField: 'operate_at' },
  aquacultureinputs: { name: '投入品', icon: null, api_type: 'aquacultureinputs', timeField: 'operate_at' },
  sampledata: { name: '打样记录', icon: null, api_type: 'sampledata', timeField: 'operate_at' },
  physical_operation: { name: '物理作业', icon: null, api_type: 'physical_operation', timeField: 'operate_at' },
  general_record: { name: '通用记录', icon: null, api_type: 'general_record', timeField: 'operate_at' }
};

export const fullFieldConfigs: Record<string, FieldConfig[]> = {
  feeding: [
    { key: 'brand', label: '饲料品牌' },
    { key: 'type', label: '饵料类型' },
    { key: 'weight', label: '投喂重量', unit: '斤' },
    { key: 'cost', label: '饵料金额', unit: '元' },
    { key: 'user_remark', label: '用户备注' }
  ],
  // Map aliases
  feed: [
    { key: 'brand', label: '饲料品牌' },
    { key: 'type', label: '饵料类型' },
    { key: 'weight', label: '投喂重量', unit: '斤' },
    { key: 'cost', label: '饵料金额', unit: '元' },
    { key: 'user_remark', label: '用户备注' }
  ],
  aquacultureinputs: [
    { key: 'name', label: '投入品名称' },
    { key: 'category1', label: '一级分类' },
    { key: 'category2', label: '二级分类' },
    { key: 'dosage_num', label: '用量' },
    { key: 'dosage_unit', label: '单位' },
    { key: 'total_cost', label: '总费用', unit: '元' },
    { key: 'use_method', label: '使用方法' },
    { key: 'effect', label: '效果' },
    { key: 'user_remark', label: '用户备注' }
  ],
  lossing: [
    { key: 'species', label: '损失品种' },
    { key: 'num', label: '损失数量', unit: '尾' },
    { key: 'weight', label: '损失重量', unit: '斤' },
    { key: 'amount', label: '损失金额', unit: '元' },
    { key: 'analysis', label: '损失分析' },
    { key: 'user_remark', label: '备注' }
  ],
  outfishpond: [
    { key: 'purpose', label: '出塘目的' },
    { key: 'species', label: '出塘品种' },
    { key: 'total_weight', label: '出塘重量', unit: '斤' },
    { key: 'quantity', label: '出塘数量', unit: '尾' },
    { key: 'sell_total', label: '总价', unit: '元' },
    { key: 'user_remark', label: '备注' }
  ],
  patrol: [
    { key: 'aquatic_status', label: '水生动物状态' },
    { key: 'water_status', label: '水体状态' },
    { key: 'abnormal_event', label: '异常事件' },
    { key: 'user_remark', label: '用户备注' }
  ],
  sampledata: [
    { key: 'species', label: '打样品种' },
    { key: 'count', label: '测样数量', unit: '尾' },
    { key: 'avg_weight', label: '平均体重', unit: '斤/条' },
    { key: 'avg_length', label: '平均长度', unit: 'cm' },
    { key: 'health_condition', label: '健康状况' },
    { key: 'growth_analysis', label: '生长分析' },
    { key: 'user_remark', label: '用户备注' }
  ],
  seed: [
    { key: 'species', label: '苗种品种' },
    { key: 'quantity', label: '苗种数量', unit: '尾' },
    { key: 'grade', label: '苗种规格' },
    { key: 'buy_total', label: '购买总金额', unit: '元' },
    { key: 'user_remark', label: '备注' }
  ],
  waterquality: [
    { key: 'ph', label: 'pH值' },
    { key: 'oxygen', label: '溶氧', unit: 'mg/L' },
    { key: 'temperature', label: '水温', unit: '℃' },
    { key: 'ammonia', label: '氨氮', unit: 'mg/L' },
    { key: 'nitrite', label: '亚硝酸盐', unit: 'mg/L' },
    { key: 'transparency', label: '透明度', unit: 'cm' },
    { key: 'user_remark', label: '用户备注' }
  ],
  physical_operation: [
    { key: 'operate_type', label: '操作类型' },
    { key: 'equipment', label: '设备' },
    { key: 'purpose', label: '目的' },
    { key: 'user_remark', label: '备注' }
  ],
  general_record: [
    { key: 'note', label: '记录' },
    { key: 'user_remark', label: '用户备注' }
  ]
};

export function getRecordTypeChineseName(recordType: string): string {
  if (!recordType || recordType === 'all') return '记录';
  
  // Try to normalize using the map first
  const normalizedType = RECORD_TYPE_MAP[recordType];
  if (normalizedType) {
    const config = recordTypeConfig[normalizedType];
    return config ? config.name : normalizedType;
  }

  // Fallback: Remove _data suffix if present
  const baseType = recordType.replace('_data', '');
  const config = recordTypeConfig[baseType];
  return config ? config.name : baseType;
}

export interface DisplayItem {
  key: string;
  label: string;
  value: string;
}

/**
 * 获取完整的展示字段列表
 * @param record 记录详情对象
 * @param type 记录类型（可选，若record中无类型信息则使用此值）
 * @returns DisplayItem[] 展示项列表
 * 逻辑：根据记录类型获取配置的字段，过滤掉排除的字段（如id, uuid, 时间等），
 * 并将最后修改者(updated_by_user)作为最后一项加入列表。
 */
export function getFullDisplayItems(record: any, type?: string): DisplayItem[] {
  if (!record) return [];
  
  // Use the module-level RECORD_TYPE_MAP instead of redefining it
  // Priority: 
  // 1. Explicitly passed 'type' (most reliable from API outer layer)
  // 2. record.record_type (if available)
  // 3. record.type (least reliable, often contains business data like '颗粒饲料')
  
  // Logic update: ONLY use record.type if it maps to a valid record type key
  let t = type || record.record_type;
  
  if (!t && record.type) {
    // Check if record.type is a valid record type key (like 'feed_data')
    // If it's business data (like '颗粒'), it won't be in the map (or will be undefined)
    if (RECORD_TYPE_MAP[record.type]) {
      t = record.type;
    }
  }
  
  const cfgKey = (t && RECORD_TYPE_MAP[t]) || t;
  const fields = fullFieldConfigs[cfgKey] || [];
  const excludeKeys = new Set([
    'operate_at', 'operate_time', 'created_at', 
    'pondid', 'pond_id', 'file_url', 'id', 'uuid', 
    'created_by', 'created_by_user', 'updated_by_user'
  ]);
  
  const items: DisplayItem[] = [];

  fields.forEach(({ key, label, unit }) => {
    if (excludeKeys.has(key)) return;
    const raw = record[key];
    if (raw === undefined || raw === null) return;

    if (typeof raw === 'string') {
      if (raw.trim() === '') return;
    } 
    else if (typeof raw === 'number') {
      if (raw === 0) return;
    }

    let value = (typeof raw === 'object') ? JSON.stringify(raw) : String(raw);
    if (unit) {
      value += unit;
    }
    items.push({ key: `${key}-${Math.random()}`, label, value });
  });

  // Handle updated_by_user (Last Editor) - Display at the bottom of the list
  if (record.updated_by_user && record.updated_by_user.nickname) {
    items.push({
      key: `updated_by_user-${Math.random()}`,
      label: '最后修改者',
      value: record.updated_by_user.nickname
    });
  }

  return items;
}

export function getRecordIcon(type: string) {
    const baseType = type.replace('_data', '');
    return RECORD_ICONS[baseType] || RECORD_ICONS['unknown'];
}
