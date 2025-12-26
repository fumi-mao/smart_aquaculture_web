import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface TrendChartProps {
  data: any[];
  loading: boolean;
}

// 参数配置映射表：将后端字段映射为中文名称、单位和颜色
const PARAM_CONFIG: Record<string, { name: string; unit: string; color: string }> = {
  ph: { name: 'pH', unit: '', color: '#ef4444' },
  oxygen: { name: '溶氧', unit: 'mg/L', color: '#10b981' },
  temperature: { name: '水温', unit: '℃', color: '#f59e0b' },
  ammonia: { name: '氨氮', unit: 'mg/L', color: '#3b82f6' },
  nitrite: { name: '亚盐', unit: 'mg/L', color: '#8b5cf6' },
  transparency: { name: '透明度', unit: 'cm', color: '#6366f1' },
  
  // Extended params based on screenshot and common variations
  alkalinity: { name: '总碱度', unit: 'mg/L', color: '#f97316' }, // Orange
  total_alkalinity: { name: '总碱度', unit: 'mg/L', color: '#f97316' },
  hardness: { name: '总硬度', unit: 'mg/L', color: '#22c55e' }, // Green
  total_hardness: { name: '总硬度', unit: 'mg/L', color: '#22c55e' },
  calcium: { name: '钙离子', unit: 'mg/L', color: '#eab308' }, // Yellow
  calcium_ion: { name: '钙离子', unit: 'mg/L', color: '#eab308' },
  orp: { name: 'ORP', unit: 'mV', color: '#a855f7' }, // Purple
  salinity: { name: '盐度', unit: '', color: '#ec4899' }, // Pink
  magnesium: { name: '镁离子', unit: 'mg/L', color: '#14b8a6' }, // Teal
  magnesium_ion: { name: '镁离子', unit: 'mg/L', color: '#14b8a6' },
  potassium: { name: '钾离子', unit: 'mg/L', color: '#64748b' }, // Slate
  potassium_ion: { name: '钾离子', unit: 'mg/L', color: '#64748b' },
  pressure: { name: '气压', unit: 'hPa', color: '#06b6d4' }, // Cyan
  air_pressure: { name: '气压', unit: 'hPa', color: '#06b6d4' },
};

/**
 * 趋势图组件 (TrendChart)
 * 作用：展示水质监测数据的历史趋势曲线。
 * 输入：
 *   - data: 历史数据列表
 *   - loading: 加载状态
 * 输出：堆叠的折线图列表
 * 逻辑：
 *   1. 数据预处理：提取时间戳和数值，过滤无效数据
 *   2. 自动识别数据中包含的监测参数
 *   3. 为每个参数渲染一个独立的折线图
 *   4. 所有折线图通过 syncId 保持交互同步（Tooltip同步）
 */
const TrendChart: React.FC<TrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-400">加载中...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">暂无数据</div>;
  }

  // 1. 数据预处理：提取时间戳和数值
  const processedData = data.map(item => {
    const detail = item.detail || item;
    const timeStr = detail.measured_at || detail.created_at || detail.operate_at;
    
    // 提取数值
    const values: any = {};
    Object.keys(detail).forEach(key => {
      const val = parseFloat(detail[key]);
      if (!isNaN(val) && PARAM_CONFIG[key]) {
        // 如果值为0，视为无效数据（断点），根据需求：字段为零的记录无需绘制
        values[key] = val === 0 ? null : val;
      }
    });

    return {
      time: timeStr,
      timestamp: new Date(timeStr).getTime(),
      ...values
    };
  }).sort((a, b) => a.timestamp - b.timestamp);

  // 2. 确定数据中存在的参数
  const availableKeys = new Set<string>();
  processedData.forEach(d => {
    Object.keys(d).forEach(k => {
      // 只要该 key 存在于数据中（哪怕是 null），我们都认为该参数存在
      // 但为了避免全是 null 的情况也渲染空图表（虽然需求说“所有字段均为零则只绘制坐标轴”，但也隐含了如果是部分零则断开）
      // 实际上，只要 PARAM_CONFIG 有配置，且数据中有这个 key（即使是 null），我们就应该渲染图表框架
      if (PARAM_CONFIG[k]) availableKeys.add(k);
    });
  });

  const activeKeys = Array.from(availableKeys);

  if (activeKeys.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">暂无趋势数据</div>;
  }

  // 3. 渲染图表
  
  // Calculate dynamic width based on data length to support horizontal scrolling
  // Assume each data point needs at least 30px space (or adjust as needed)
  // But maintain a minimum width of 100% or a fixed pixel value
  const minWidth = 1200; // Increase base minimum width
  const pointWidth = 20; // Width per data point
  const dynamicWidth = Math.max(minWidth, processedData.length * pointWidth);
  
  const smallKeysSet = new Set(['nitrite', 'ammonia', 'oxygen']);
  const formatTickPreview = (val: number, key: string, unit: string) => {
    const decimals = smallKeysSet.has(key) ? 3 : 2;
    const n = Number((typeof val === 'number' ? val : 0).toFixed(decimals));
    return unit ? `${n}${unit}` : `${n}`;
  };
  const computeYAxisWidth = (key: string, unit: string, values: number[], domain: [number|'auto', number|'auto']) => {
    const minV = typeof domain[0] === 'number' ? domain[0] : (values.length ? Math.min(...values) : 0);
    const maxV = typeof domain[1] === 'number' ? domain[1] : (values.length ? Math.max(...values) : 0);
    const samples = [minV, maxV].map(v => formatTickPreview(v, key, unit));
    const longest = Math.max(...samples.map(s => (s ? s.length : 0)));
    return Math.min(140, Math.max(60, 36 + longest * 7));
  };
  const yAxisWidthPerKey: Record<string, number> = {};
  const widthCandidates: number[] = [];
  activeKeys.forEach(k => {
    const cfg = PARAM_CONFIG[k];
    const vals = processedData.map(d => d[k]).filter(v => v !== null && v !== undefined) as number[];
    let minVal = 0;
    let maxVal = 0;
    if (vals.length > 0) {
      minVal = Math.min(...vals);
      maxVal = Math.max(...vals);
    }
    let domain: [number|'auto', number|'auto'] = ['auto', 'auto'];
    if (vals.length > 0) {
      if (minVal === maxVal) {
        domain = [minVal - Math.abs(minVal * 0.2) || -10, maxVal + Math.abs(maxVal * 0.2) || 10];
      } else {
        const padding = (maxVal - minVal) * 0.5;
        domain = [minVal - padding, maxVal + padding];
      }
    }
    const w = computeYAxisWidth(k, cfg.unit, vals, domain);
    yAxisWidthPerKey[k] = w;
    widthCandidates.push(w);
  });
  const uniformYAxisWidth = widthCandidates.length ? Math.max(...widthCandidates) : 60;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar gap-8 pr-2 pb-4 overflow-x-auto">
      {activeKeys.map((key, index) => {
        const config = PARAM_CONFIG[key];
        
        // 计算 Y 轴 Domain
        const values = processedData.map(d => d[key]).filter(v => v !== null && v !== undefined) as number[];
        let domain: [number | 'auto', number | 'auto'] = ['auto', 'auto'];
        let minVal = 0;
        let maxVal = 0;
        
        if (values.length > 0) {
           minVal = Math.min(...values);
           maxVal = Math.max(...values);
           if (minVal === maxVal) {
              domain = [minVal - Math.abs(minVal * 0.2) || -10, maxVal + Math.abs(maxVal * 0.2) || 10];
           } else {
              const padding = (maxVal - minVal) * 0.5; // 增加上下各 50% 的缓冲，使曲线位于中间
              domain = [minVal - padding, maxVal + padding];
           }
        }

        return (
          <SingleChart 
            key={key}
            config={config}
            data={processedData}
            dataKey={key}
            domain={domain}
            values={values}
            width={dynamicWidth}
            yAxisWidth={uniformYAxisWidth}
          />
        );
      })}
    </div>
  );
};

interface SingleChartProps {
  config: any;
  data: any[];
  dataKey: string;
  domain: [number | 'auto', number | 'auto'];
  values: number[];
  width: number;
  yAxisWidth: number;
}

const SingleChart: React.FC<SingleChartProps> = ({ config, data, dataKey, domain, values, width, yAxisWidth }) => {
  const [hoverData, setHoverData] = React.useState<{ y: number, value: number } | null>(null);
  const formatYAxisTick = React.useCallback((val: number) => {
    if (typeof val !== 'number' || isNaN(val)) return '';
    const smallKeys = ['nitrite', 'ammonia', 'oxygen'];
    const decimals = smallKeys.includes(dataKey) ? 3 : 2;
    const n = Number(val.toFixed(decimals));
    return config.unit ? `${n}${config.unit}` : `${n}`;
  }, [dataKey, config.unit]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeCoordinate && e.activeCoordinate.y) {
       // 计算实际纵坐标
       // Recharts 容器高度 200px
       // margin top 5, bottom 5
       // XAxis height 30 (default approx, we need to be precise)
       // Plotting Height = 200 - 5 (top) - 5 (bottom) - 30 (XAxis) = 160px
       
       const chartHeight = 160; 
       const marginTop = 5;
       const y = e.activeCoordinate.y; // Relative to chart container
       
       // Check if domain is 'auto'
       const min = typeof domain[0] === 'number' ? domain[0] : 0;
       const max = typeof domain[1] === 'number' ? domain[1] : 100;
       
       // Y coordinate in SVG goes from top (0) to bottom (height)
       // Value = Max - (y_in_plot / height) * (Max - Min)
       // y_in_plot = y - marginTop
       
       const ratio = (y - marginTop) / chartHeight;
       const value = max - ratio * (max - min);
       
       setHoverData({ y, value });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  return (
    <div 
      className="h-[200px] shrink-0 relative outline-none chart-no-outline"
      style={{ minWidth: width, width: '100%' }}
    >
       <div className="mb-2 ml-10 text-sm font-bold text-gray-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }}></span>
          {config.name}
       </div>
       
       {/* Custom Cursor Overlay */}
       {hoverData && (
          <>
            {/* Horizontal Line */}
            <div 
              className="absolute w-full border-t border-dashed border-gray-400 pointer-events-none z-0"
              style={{ top: hoverData.y + 24 + 5, left: yAxisWidth, width: `calc(100% - ${yAxisWidth}px)` }} 
            ></div>
            {/* Y Axis Label */}
            <div 
               className="absolute bg-gray-800 text-white text-xs px-1 py-0.5 rounded pointer-events-none z-20"
               style={{ top: hoverData.y + 24 + 5 - 10, left: yAxisWidth + 2, width: Math.max(50, yAxisWidth - 10), textAlign: 'left' }}
            >
               {hoverData.value.toFixed(2)}
            </div>
          </>
       )}

       <ResponsiveContainer width="100%" height="100%">
         <LineChart
           data={data}
           margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
           onMouseMove={handleMouseMove}
           onMouseLeave={handleMouseLeave}
         >
           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
           <XAxis 
              dataKey="time" 
              tickFormatter={(str) => {
                  try {
                      return format(new Date(str), 'MM-dd HH:mm');
                  } catch {
                      return str;
                  }
              }}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              minTickGap={30}
              height={30}
           />
          <YAxis 
             orientation="left" 
             tick={{ fontSize: 12, fill: '#6b7280' }} 
             axisLine={{ stroke: '#e5e7eb' }}
             tickLine={{ stroke: '#e5e7eb' }}
             domain={domain}
             allowDataOverflow={false} 
             tickFormatter={formatYAxisTick}
             allowDecimals
             width={yAxisWidth}
           />
           <Tooltip
              trigger="hover"
              labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd HH:mm:ss')}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              cursor={{ strokeDasharray: '3 3', stroke: '#9ca3af' }}
           />
           <Line
             type="monotone"
             dataKey={dataKey}
             stroke={config.color}
             strokeWidth={2}
             dot={false}
             activeDot={{ r: 6 }}
             name={config.name}
             unit={config.unit}
             animationDuration={1000}
             connectNulls={false} // 不连接断点
           />
         </LineChart>
       </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
