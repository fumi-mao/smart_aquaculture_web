import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

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
 *   - data: 包含指标数据的数组 (通常为近 7 日内的数据)
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
  /**
   * 交互状态
   * 作用：在鼠标/触摸滑动时显示十字虚线，并展示最近点的数据信息
   */
  const [hoverCoord, setHoverCoord] = React.useState<{ x: number; y: number } | null>(null);

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
      <span className="text-xs text-gray-500 font-medium truncate">{name}</span>
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

  const values = validData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = max - min;
  const padding = delta === 0 ? Math.max(Math.abs(max) * 0.08, 1) : Math.max(delta * 0.08, 0.2);
  const domain: [number, number] = [min - padding, max + padding];

  /**
   * Tooltip 内容渲染
   * 作用：展示最近点的时间和值信息
   * 输入：
   *  - active: 是否显示 Tooltip
   *  - label: 当前点对应的 time（XAxis dataKey）
   *  - payload: 当前点数据（包含 value）
   * 输出：自定义 Tooltip UI
   */
  const CustomTooltip = (props: any) => {
    const { active, label, payload } = props || {};
    if (!active || !payload || !payload.length) return null;
    const v = payload?.[0]?.value;
    const timeStr = label;
    const formattedTime = (() => {
      try {
        return format(new Date(timeStr), 'yyyy-MM-dd HH:mm:ss');
      } catch {
        return String(timeStr || '');
      }
    })();
    const formattedValue = typeof v === 'number' && !Number.isNaN(v) ? v : null;
    return (
      <div className="rounded-lg bg-white/95 backdrop-blur border border-gray-200 shadow-sm px-2 py-1">
        <div className="text-[11px] text-gray-500 whitespace-nowrap">{formattedTime}</div>
        <div className="text-[12px] text-gray-900 font-bold whitespace-nowrap">
          {name}：{formattedValue !== null ? formattedValue : '-'}
          <span className="text-[11px] font-normal text-gray-400 ml-1">{unit}</span>
        </div>
      </div>
    );
  };

  /**
   * 鼠标/触摸移动事件
   * 作用：记录当前指针在图表中的坐标，用于绘制十字虚线
   */
  const handleMove = (e: any) => {
    if (e?.activeCoordinate && typeof e.activeCoordinate.x === 'number' && typeof e.activeCoordinate.y === 'number') {
      setHoverCoord({ x: e.activeCoordinate.x, y: e.activeCoordinate.y });
      return;
    }
    setHoverCoord(null);
  };

  /**
   * 鼠标/触摸离开事件
   * 作用：清理十字虚线显示
   */
  const handleLeave = () => {
    setHoverCoord(null);
  };

  return (
    <div className="flex flex-col w-full h-14">
      {renderInfo()}
      
      <div className="flex-1 w-full min-h-0 relative">
        {/* 十字虚线：根据当前 hover 坐标绘制横向/纵向虚线 */}
        {hoverCoord && (
          <>
            <div
              className="absolute left-0 right-0 border-t border-dashed border-gray-400 pointer-events-none z-10"
              style={{ top: hoverCoord.y }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-dashed border-gray-400 pointer-events-none z-10"
              style={{ left: hoverCoord.x }}
            />
          </>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={validData}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            onTouchMove={handleMove}
            onTouchEnd={handleLeave}
          >
            <defs>
              <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={domain} hide />
            <Tooltip
              trigger="hover"
              content={CustomTooltip}
              cursor={false}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area 
              type="monotone"
              dataKey="value" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color-${dataKey})`} 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              isAnimationActive={false} // 列表页禁用动画提高性能
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MiniTrendChart;
