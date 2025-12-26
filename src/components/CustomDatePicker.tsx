import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore, addMonths, startOfMonth, getDaysInMonth, getDay, isSameDay, isWithinInterval, set } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface CustomDatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * 自定义日期选择器组件 (CustomDatePicker)
 * 作用：提供快捷日期选择（今天、昨天、近7天、近30天）以及日历范围选择功能。
 * 逻辑优化：
 *   1. 修复了样式崩坏问题，固定了弹窗宽度。
 *   2. 修复了日期选择逻辑，采用 "点击开始 -> 点击结束" 的交互模式。
 *   3. 修复了重复渲染日历的问题。
 *   4. 使用 Portal 渲染弹窗，解决 z-index 和 overflow 问题。
 */
const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  
  // 内部状态：记录用户是否正在选择范围（已点击开始时间，等待点击结束时间）
  // 如果为 null，表示当前没有进行中的选择（或者是选择已完成）
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSelectionStart(null); // 重置选择状态
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 当弹窗打开时，计算位置并将视图日期同步为当前选中开始日期的月份
  useEffect(() => {
    if (isOpen) {
      setViewDate(startOfMonth(value.startDate));
      setSelectionStart(null);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            right: window.innerWidth - rect.right, // Align right edge
            zIndex: 9999,
        });
      }
    }
  }, [isOpen]);

  // Handle window resize/scroll to update position (optional but good for UX)
  useEffect(() => {
      const updatePosition = () => {
          if (isOpen && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setPopoverStyle(prev => ({
                  ...prev,
                  top: rect.bottom + 8,
                  right: window.innerWidth - rect.right
              }));
          }
      };
      
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true); // Capture scroll
      
      return () => {
          window.removeEventListener('resize', updatePosition);
          window.removeEventListener('scroll', updatePosition, true);
      };
  }, [isOpen]);

  const shortcuts = [
    { label: '当天', days: 0 },
    { label: '昨天', days: 1, offset: 1 },
    { label: '最近7天', days: 6 },
    { label: '最近30天', days: 29 },
  ];

  const handleShortcutClick = (days: number, offset: number = 0) => {
    const end = subDays(new Date(), offset);
    const start = subDays(end, days);
    onChange({
      startDate: startOfDay(start),
      endDate: endOfDay(end)
    });
    setIsOpen(false);
  };

  const handleDateClick = (date: Date) => {
    if (isAfter(date, new Date())) return; // 禁止选择未来

    if (!selectionStart) {
      // 第一次点击：只设置内部状态，不触发 onChange
      setSelectionStart(date);
    } else {
      // 第二次点击：完成范围选择，触发 onChange
      if (isBefore(date, selectionStart)) {
        // 如果第二次点击在第一次之前，交换
        onChange({ startDate: startOfDay(date), endDate: endOfDay(selectionStart) });
      } else {
        onChange({ startDate: startOfDay(selectionStart), endDate: endOfDay(date) });
      }
      setSelectionStart(null); // 结束选择流程
    }
  };

  const renderCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDayOfMonth = getDay(startOfMonth(monthDate)); 
    // Adjust for Monday start: 0(Sun) -> 6, 1(Mon) -> 0
    const startDay = (firstDayOfMonth + 6) % 7; 

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      const isFuture = isAfter(current, new Date());
      
      // 样式逻辑
      let isSelected = false;
      let isInRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (!isFuture) {
        if (selectionStart) {
            // 正在选择模式：只高亮 selectionStart 作为开始点
            // 这里我们只高亮用户第一次点击的那个日期，等待第二次点击
            isRangeStart = isSameDay(current, selectionStart);
            isRangeEnd = false; 
            isInRange = false; // 暂不显示预览范围，避免视觉干扰，或者可以根据 hover 扩展（暂不实现 hover）
        } else {
            // 常规显示模式：显示当前的 value
            isRangeStart = isSameDay(current, value.startDate);
            isRangeEnd = isSameDay(current, value.endDate);
            isInRange = isWithinInterval(current, { start: value.startDate, end: value.endDate });
        }
      }

      let className = "h-8 w-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors relative z-10 ";
      
      if (isFuture) {
        className += "text-gray-300 cursor-not-allowed bg-transparent";
      } else if (isRangeStart || isRangeEnd) {
        className += "bg-blue-600 text-white hover:bg-blue-700";
      } else if (isInRange) {
        className = "h-8 w-8 flex items-center justify-center text-sm bg-blue-50 text-blue-600 rounded-none cursor-pointer hover:bg-blue-100";
      } else {
        className += "text-gray-700 hover:bg-gray-100";
      }

      days.push(
        <div 
          key={d} 
          className={className}
          onClick={() => handleDateClick(current)}
        >
          {d}
        </div>
      );
    }

    return (
      <div className="w-64 p-2">
        <div className="flex justify-center items-center mb-4">
           <span className="font-bold text-gray-800 text-sm">{format(monthDate, 'yyyy年 M月')}</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['一', '二', '三', '四', '五', '六', '日'].map(d => (
            <span key={d} className="text-xs text-gray-400 font-medium">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2 gap-x-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <div 
        className={`flex items-center justify-center relative gap-2 bg-white border rounded-md px-3 py-1.5 cursor-pointer transition-colors shadow-sm ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300 hover:border-blue-400'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-center gap-2 text-sm text-gray-700 font-medium font-mono w-full">
           <span>{format(value.startDate, 'yyyy-MM-dd')}</span>
           <span className="text-gray-400">→</span>
           <span>{format(value.endDate, 'yyyy-MM-dd')}</span>
        </div>
        <CalendarIcon size={16} className="text-gray-500 absolute right-3" />
      </div>

      {/* Popover using Portal */}
      {isOpen && createPortal(
        <div 
          ref={popoverRef}
          style={popoverStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-xl flex animate-in fade-in zoom-in-95 duration-200 w-max"
        >
          {/* Shortcuts Sidebar */}
          <div className="w-28 bg-gray-50 border-r border-gray-100 flex flex-col p-3 gap-1 shrink-0">
            {shortcuts.map((s, i) => (
              <button
                key={i}
                className="text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:text-blue-600 rounded-md transition-all hover:shadow-sm"
                onClick={() => handleShortcutClick(s.days, s.offset)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Calendars Container */}
          <div className="flex flex-col">
              {/* Header with Navigation */}
              <div className="flex justify-between items-center px-4 pt-3 pb-0">
                 <button 
                    onClick={() => setViewDate(addMonths(viewDate, -1))} 
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                 >
                    <ChevronLeft size={18} />
                 </button>
                 <button 
                    onClick={() => setViewDate(addMonths(viewDate, 1))} 
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                 >
                     <ChevronRight size={18} />
                 </button>
              </div>

              {/* Calendars Row */}
              <div className="flex p-2 gap-4">
                 {renderCalendar(viewDate)}
                 {renderCalendar(addMonths(viewDate, 1))}
              </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomDatePicker;
