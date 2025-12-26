import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface MiniTrendChartProps {
  /** 数据源 */
  data: any[];
  /** 数据键名 (e.g., 'ph', 'nitrite', 'ammonia') */
  dataKey: string;
  /** 线条和填充颜色 */
  color: string;
  /** 指标名称 */
  name: string;
  /** 单位 */
  unit?: string;
  /** 
   * 数据是否不足的标志 
   * 如果为 true，显示“水质数据不足”
   */
  insufficient?: boolean;
}

/**
 * 迷你趋势图组件 (MiniTrendChart)
 * 作用：在卡片中展示单个水质指标的微型趋势图（带阴影）
 * 输入：
 *   - data: 包含指标数据的数组 (通常为最近2条)
 *   - dataKey: 要展示的字段名
 *   - color: 主题色
 *   - name: 指标名
 *   - unit: 单位
 * 输出：
 *   - 一个带有渐变阴影的微型面积图
 *   - 或者无数据/数据不足的提示文本
 */
const MiniTrendChart: React.FC<MiniTrendChartProps> = ({ 
  data, 
  dataKey, 
  color, 
  name,
  unit = '',
  insufficient = false
}) => {
  // 过滤出有效数据（非null/undefined）
  const validData = data.filter(item => {
    const val = item.detail?.[dataKey];
    return val !== null && val !== undefined;
  }).map(item => ({
    value: Number(item.detail[dataKey]),
    // 使用 operate_at 或 created_at 作为唯一标识或排序依据
    time: item.detail.operate_at || item.detail.created_at
  })).reverse(); // 接口返回通常是倒序（最新在前），图表需要正序（旧->新）

  // 获取最新值用于展示
  const latestValue = validData.length > 0 ? validData[validData.length - 1].value : null;

  // 渲染左侧信息区域 (名称 + 最新值)
  const renderInfo = () => (
    <div className="flex justify-between items-end mb-1 w-full px-1">
      <span className="text-xs text-gray-500 font-medium">{name}</span>
      <span className="text-sm font-bold text-gray-900">
        {latestValue !== null ? latestValue : '-'} 
        <span className="text-xs font-normal text-gray-400 ml-0.5 scale-90 inline-block">{unit}</span>
      </span>
    </div>
  );

  // 无数据或数据不足的处理
  if (!validData || validData.length === 0) {
    return (
      <div className="flex flex-col w-full h-14">
        {renderInfo()}
        <div className="flex-1 bg-gray-50 rounded flex items-center justify-center border border-dashed border-gray-200">
          <span className="text-xs text-gray-400 transform scale-90">暂无水质数据</span>
        </div>
      </div>
    );
  }

  // 如果只有一条数据，无法绘制趋势线，显示点或提示
  if (validData.length < 2 || insufficient) {
     return (
      <div className="flex flex-col w-full h-14">
        {renderInfo()}
        <div className="flex-1 bg-gray-50 rounded flex items-center justify-center border border-dashed border-gray-200">
           {/* 仍然展示最新值，但图表区域提示不足 */}
          <span className="text-xs text-gray-400 transform scale-90">水质数据不足</span>
        </div>
      </div>
    );
  }

  // 计算Y轴范围，增加一点缓冲
  const values = validData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.5;
  // 如果 min === max (直线)，padding 为 0，导致 domain [min, min]，recharts 会处理，但最好手动给点范围
  const domain = min === max 
    ? [min - (min * 0.1 || 1), max + (max * 0.1 || 1)] 
    : [min - padding, max + padding];

  return (
    <div className="flex flex-col w-full h-14">
      {renderInfo()}
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={validData}>
            <defs>
              <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={domain} hide />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color-${dataKey})`} 
              strokeWidth={2}
              isAnimationActive={false} // 列表页禁用动画提高性能
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MiniTrendChart;
