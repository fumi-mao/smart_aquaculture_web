import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pond } from '@/services/ponds';
import MiniTrendChart from './MiniTrendChart';
import { MapPin } from 'lucide-react';
import { DEFAULT_ASSETS } from '@/config';

interface PondCardProps {
  pond: Pond;
  waterQualityData?: any[];
  loadingData?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
}

/**
 * 塘口展示卡片 (PondCard)
 * 作用：展示塘口基本信息及核心水质指标的趋势
 */
const PondCard: React.FC<PondCardProps> = ({ pond, waterQualityData = [], loadingData = false, selected = false, selectable = false, onToggleSelect }) => {
  const navigate = useNavigate();

  // 指标配置
  const metrics = [
    { key: 'ph', name: 'pH', color: '#f97316', unit: '' },      // Orange
    { key: 'nitrite', name: '亚盐', color: '#ef4444', unit: 'mg/L' }, // Red
    { key: 'ammonia', name: '氨氮', color: '#14b8a6', unit: 'mg/L' }, // Teal
  ];

  const selectedClass = selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#fafafa]' : '';

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col ${selectedClass}`} 
      onClick={() => navigate(`/pond/${pond.id}`, { state: { pond } })}
    >
      {/* Card Header */}
      <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0 mr-2">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onClick={e => {
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect();
              }}
              readOnly
              className="w-4 h-4 accent-blue-600"
            />
          )}
          <h3 className="font-bold text-gray-900 text-xl truncate">{pond.name}</h3>
          {pond.is_demo && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded shrink-0">
              示例
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[120px]">
                {[pond.province, pond.city, pond.district].filter(Boolean).join('') || '未知位置'}
            </span>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="flex p-4 gap-4 min-h-[13rem]"> 
        {/* Pond Image - 适当压缩宽度以留给图表 */}
        <div className="w-28 h-28 shrink-0 self-center bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center">
          <img
            src={pond.picture_url || DEFAULT_ASSETS.POND_AVATAR}
            alt={pond.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Metrics (Trend Charts) */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
            {loadingData ? (
               <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
                 <span>加载趋势数据...</span>
               </div>
            ) : (
              <>
                {metrics.map(metric => (
                  <MiniTrendChart 
                    key={metric.key}
                    data={waterQualityData}
                    dataKey={metric.key}
                    name={metric.name}
                    color={metric.color}
                    unit={metric.unit}
                    // 如果数据少于2条，视为不足以绘制趋势（MiniTrendChart内部会处理）
                    insufficient={waterQualityData && waterQualityData.length > 0 && waterQualityData.length < 2}
                  />
                ))}
              </>
            )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="grid grid-cols-3 border-t border-gray-100 text-xs text-gray-600 divide-x divide-gray-100 bg-gray-50/50">
         <div className="p-2 text-center truncate flex flex-col items-center justify-center gap-0.5">
            <span className="text-gray-400 scale-90">塘口面积</span>
            <span className="font-bold text-gray-900">{pond.breed_area ? `${pond.breed_area}亩` : '-'}</span>
         </div>
         <div className="p-2 text-center truncate flex flex-col items-center justify-center gap-0.5">
            <span className="text-gray-400 scale-90">最大水深</span>
            <span className="font-bold text-gray-900">{pond.max_depth ? `${pond.max_depth}m` : '-'}</span>
         </div>
         <div className="p-2 text-center truncate flex flex-col items-center justify-center gap-0.5">
            <span className="text-gray-400 scale-90">养殖品种</span>
            <span className="font-bold text-gray-900 truncate w-full px-1">{pond.breed_species || '-'}</span>
         </div>
      </div>

    </div>
  );
};

export default PondCard;
