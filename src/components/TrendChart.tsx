import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface TrendChartProps {
  data: any[];
  loading: boolean;
  /**
   * 导出模式
   * 作用：用于 PDF 导出时的二次渲染，避免滚动容器影响布局，并关闭动画以保证截图稳定
   * 输入：true/false
   * 输出：渲染策略切换（容器样式、动画开关）
   */
  exportMode?: boolean;
  /**
   * 导出宽度（px）
   * 作用：导出 PDF 时按页面宽度固定图表渲染宽度，避免 ResponsiveContainer 在离屏环境无法及时测量导致空白图
   * 输入：像素宽度
   * 输出：用于 X 轴刻度规划与图表实际绘制宽度
   */
  exportWidthPx?: number;
}

// 参数配置映射表：将后端字段映射为中文名称、单位和颜色
const PARAM_CONFIG: Record<string, { name: string; unit: string; color: string }> = {
  weight: { name: '投料量', unit: 'kg', color: '#db2777' }, // Pink
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
const TrendChart: React.FC<TrendChartProps> = ({ data, loading, exportMode = false, exportWidthPx }) => {
  if (loading) {
    return <div className="h-full flex items-center justify-center text-gray-400">加载中...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">暂无数据</div>;
  }

  // 1. 数据预处理：提取时间戳和数值
  const processedData = data.map(item => {
    const detail = item.detail || item;
    const timeStr = detail.measured_at || detail.created_at || detail.operate_at || detail.feed_time;
    
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

  const activeKeys = Array.from(availableKeys).sort((a, b) => {
    // 投料趋势图位于最上方
    if (a === 'weight') return -1;
    if (b === 'weight') return 1;
    return 0;
  });

  if (activeKeys.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-400">暂无趋势数据</div>;
  }

  // 3. 渲染图表

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
    return Math.min(110, Math.max(52, 22 + longest * 6));
  };
  const yAxisWidthPerKey: Record<string, number> = {};
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
  });

  return (
    <div className={exportMode ? 'flex flex-col w-full gap-8' : 'flex flex-col h-full overflow-y-auto custom-scrollbar gap-8 pr-2 pb-4'}>
      {activeKeys.map((key) => {
        const config = PARAM_CONFIG[key];
        
        // 过滤出该字段有值的数据
        const specificData = processedData.filter(d => d[key] !== null && d[key] !== undefined);
        const values = specificData.map(d => d[key]) as number[];

        // 计算 Y 轴 Domain
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
        const yAxisWidth = yAxisWidthPerKey[key] || 60;

        return (
          <SingleChart 
            key={key}
            config={config}
            data={specificData}
            dataKey={key}
            domain={domain}
            yAxisWidth={yAxisWidth}
            exportMode={exportMode}
            exportWidthPx={exportWidthPx}
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
  yAxisWidth: number;
  /**
   * 导出模式
   * 作用：用于导出截图时关闭动画，避免截图时序导致的曲线/坐标未绘制完整
   */
  exportMode?: boolean;
  /**
   * 导出宽度（px）
   * 作用：在导出模式下使用固定宽度渲染图表，确保横轴刻度间距与 PDF 页面一致
   */
  exportWidthPx?: number;
}

const SingleChart: React.FC<SingleChartProps> = ({ config, data, dataKey, domain, yAxisWidth, exportMode = false, exportWidthPx }) => {
  const [hoverData, setHoverData] = React.useState<{ y: number, value: number } | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [data]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.getBoundingClientRect().width || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const formatYAxisTick = React.useCallback((val: number) => {
    if (typeof val !== 'number' || isNaN(val)) return '';
    const smallKeys = ['nitrite', 'ammonia', 'oxygen'];
    const decimals = smallKeys.includes(dataKey) ? 3 : 2;
    const n = Number(val.toFixed(decimals));
    return config.unit ? `${n}${config.unit}` : `${n}`;
  }, [dataKey, config.unit]);

  const tickPlan = React.useMemo(() => {
    const times = (data || []).map((d) => d?.time).filter(Boolean) as string[];
    const uniqueTimes = Array.from(new Set(times));
    const count = uniqueTimes.length;
    const effectiveWidth = exportMode && exportWidthPx ? exportWidthPx : containerWidth;
    const safeWidth = Number.isFinite(effectiveWidth) ? effectiveWidth : 0;
    const plotWidth = Math.max(0, safeWidth - (Math.max(0, yAxisWidth) + 24));
    const fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

    const formatSingle = (str: string) => {
      try {
        return format(new Date(str), 'MM-dd HH:mm');
      } catch {
        return String(str || '');
      }
    };
    const formatDouble = (str: string) => {
      try {
        return [format(new Date(str), 'HH:mm'), format(new Date(str), 'MM-dd')] as const;
      } catch {
        const s = String(str || '');
        return [s, ''] as const;
      }
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const measure = (text: string, fontSize: number) => {
      if (!ctx) return text.length * fontSize * 0.55;
      ctx.font = `${fontSize}px ${fontFamily}`;
      return ctx.measureText(text).width;
    };

    type Candidate = { mode: 'single' | 'double'; fontSize: number; angle: number };
    const candidates: Candidate[] = [
      { mode: 'double', fontSize: 11, angle: 0 },
      { mode: 'double', fontSize: 10, angle: 0 },
      { mode: 'double', fontSize: 10, angle: -35 },
    ];

    const resolve = (cand: Candidate) => {
      const rad = (Math.abs(cand.angle) * Math.PI) / 180;
      const lineHeight = cand.fontSize * 1.15;
      const labelHeight = (cand.mode === 'double' ? lineHeight * 2 : lineHeight) + 4;
      const baseWidths = uniqueTimes.map((t) => {
        if (cand.mode === 'double') {
          const [a, b] = formatDouble(t);
          return Math.max(measure(a, cand.fontSize), measure(b, cand.fontSize));
        }
        return measure(formatSingle(t), cand.fontSize);
      });
      const maxW = baseWidths.length ? Math.max(...baseWidths) : 0;
      const widthEff = cand.angle === 0 ? maxW : maxW * Math.cos(rad) + labelHeight * Math.sin(rad);
      const gap = Math.max(8, Math.round(cand.fontSize * 0.7));
      const perTick = Math.max(10, widthEff + gap);
      const maxTicks = plotWidth > 0 ? Math.max(2, Math.floor(plotWidth / perTick)) : 2;
      const showAll = count <= maxTicks;

      const halfPad = Math.min(120, Math.max(12, Math.ceil(widthEff / 2) + 10));
      const height = cand.angle === 0 ? (cand.mode === 'double' ? 52 : 40) : 70;

      if (showAll || count <= 2) {
        return {
          ...cand,
          ticks: undefined as string[] | undefined,
          padding: { left: halfPad, right: halfPad },
          height,
        };
      }

      const step = Math.max(1, Math.ceil((count - 1) / (maxTicks - 1)));
      const selected: string[] = [];
      for (let i = 0; i < count; i += step) selected.push(uniqueTimes[i]);
      const last = uniqueTimes[count - 1];
      if (selected[selected.length - 1] !== last) selected.push(last);

      return {
        ...cand,
        ticks: selected,
        padding: { left: halfPad, right: halfPad },
        height,
      };
    };

    for (const cand of candidates) {
      const plan = resolve(cand);
      if (!plan.ticks) return plan;
    }

    return resolve(candidates[candidates.length - 1]);
  }, [containerWidth, data, exportMode, exportWidthPx, yAxisWidth]);

  const CustomXAxisTick = React.useCallback((props: any) => {
    const { x, y, payload } = props;
    const value = payload?.value;
    const fontSize = tickPlan.fontSize;
    const fill = '#6b7280';
    const fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

    const makeSingle = () => {
      try {
        return format(new Date(value), 'MM-dd HH:mm');
      } catch {
        return String(value || '');
      }
    };
    const makeDouble = () => {
      try {
        return [format(new Date(value), 'HH:mm'), format(new Date(value), 'MM-dd')] as const;
      } catch {
        const s = String(value || '');
        return [s, ''] as const;
      }
    };

    if (tickPlan.mode === 'double') {
      const [a, b] = makeDouble();
      const transform = tickPlan.angle ? `rotate(${tickPlan.angle}, ${x}, ${y})` : undefined;
      const anchor = tickPlan.angle ? 'end' : 'middle';
      const dx = tickPlan.angle ? -4 : 0;
      return (
        <g transform={transform}>
          <text x={x + dx} y={y} textAnchor={anchor} fill={fill} fontSize={fontSize} fontFamily={fontFamily}>
            <tspan x={x + dx} dy="0">{a}</tspan>
            <tspan x={x + dx} dy={fontSize * 1.15}>{b}</tspan>
          </text>
        </g>
      );
    }

    const text = makeSingle();
    if (tickPlan.angle) {
      return (
        <g transform={`rotate(${tickPlan.angle}, ${x}, ${y})`}>
          <text x={x - 4} y={y} textAnchor="end" fill={fill} fontSize={fontSize} fontFamily={fontFamily}>
            {text}
          </text>
        </g>
      );
    }

    return (
      <text x={x} y={y} textAnchor="middle" fill={fill} fontSize={fontSize} fontFamily={fontFamily}>
        {text}
      </text>
    );
  }, [tickPlan]);

  const handleMouseMove = (e: any) => {
    if (e && e.activeCoordinate && e.activeCoordinate.y) {
       // 计算实际纵坐标
       // Recharts 容器高度 200px
       // margin top 5, bottom 5
       // XAxis height 30 (default approx, we need to be precise)
       // Plotting Height = 200 - 5 (top) - 5 (bottom) - 30 (XAxis) = 160px
       
       const chartHeight = 141; 
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
    if (e && typeof e.activeTooltipIndex === 'number' && !isNaN(e.activeTooltipIndex)) {
      setActiveIndex(e.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
    setActiveIndex(-1);
  };

  const renderDot = React.useCallback((props: any) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null) return null;
    const isActive = activeIndex >= 0 && index === activeIndex;
    const r = isActive ? 4 : 3;
    const fill = isActive ? config.color : '#ffffff';
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={config.color}
        strokeWidth={2}
        fill={fill}
      />
    );
  }, [activeIndex, config.color]);

  return (
    <div 
      ref={containerRef}
      className="h-[200px] shrink-0 relative outline-none chart-no-outline"
      style={{ width: '100%' }}
      data-trend-export-item="true"
      data-trend-point-count={data?.length || 0}
    >
       <div className="mb-2 ml-10 text-sm font-bold text-gray-700 flex items-center gap-2" data-trend-title-row="true">
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
              data-export-ignore="true"
            ></div>
            {/* Y Axis Label */}
            <div 
               className="absolute bg-gray-800 text-white text-xs px-1 py-0.5 rounded pointer-events-none z-20"
               style={{ top: hoverData.y + 24 + 5 - 10, left: yAxisWidth + 2, width: Math.max(50, yAxisWidth - 10), textAlign: 'left' }}
               data-export-ignore="true"
            >
               {hoverData.value.toFixed(2)}
            </div>
          </>
       )}

       {exportMode && exportWidthPx ? (
        <LineChart
          width={exportWidthPx}
          height={200}
          data={data}
          margin={{ top: 5, right: 44, left: 0, bottom: 18 }}
        >
           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
           <XAxis 
              dataKey="time" 
              ticks={tickPlan.ticks}
              interval={0}
              tick={CustomXAxisTick as any}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              height={tickPlan.height}
              padding={tickPlan.padding}
              tickMargin={6}
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
            dot={renderDot}
            activeDot={false}
            name={config.name}
            unit={config.unit}
            isAnimationActive={!exportMode}
            animationDuration={exportMode ? 0 : 1000}
            connectNulls={false} // 不连接断点
          />
        </LineChart>
       ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 44, left: 0, bottom: 18 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseLeave}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="time" 
              ticks={tickPlan.ticks}
              interval={0}
              tick={CustomXAxisTick as any}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={{ stroke: '#e5e7eb' }}
              height={tickPlan.height}
              padding={tickPlan.padding}
              tickMargin={6}
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
              dot={renderDot}
              activeDot={false}
              name={config.name}
              unit={config.unit}
              isAnimationActive={!exportMode}
              animationDuration={exportMode ? 0 : 1000}
              connectNulls={false} // 不连接断点
            />
          </LineChart>
        </ResponsiveContainer>
       )}
    </div>
  );
};

export default TrendChart;
