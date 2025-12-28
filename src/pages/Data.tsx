import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format, isSameMonth, isSameDay } from 'date-fns';
import { Pond, getTrendData } from '@/services/ponds';
import { fetchDisplayPonds } from '@/utils/pondLoader';
import { DEFAULT_EXPORT_TYPES } from '@/services/export';
import { DEFAULT_ASSETS } from '@/config';
import { getFullDisplayItems, getRecordIcon, getRecordTypeChineseName } from '@/utils/recordUtils';
import { cn } from '@/lib/utils';
import { getAiAnalysisText, getAnalysisItem } from '@/services/analysis';

type TimelineRawItem = {
  type?: string;
  detail?: any;
  created_at?: string;
  updated_at?: string;
  [k: string]: any;
};

type CalendarRecord = {
  id: string | number;
  rawTime: string;
  type: string;
  typeName: string;
  icon: string;
  displayItems: { label: string; value: string }[];
  detail: any;
};

type CalendarCell = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  records: CalendarRecord[];
};

function getRecordRawTime(detail: any, item: TimelineRawItem, type: string) {
  const t = detail?.operate_at || detail?.operate_time || detail?.created_at || detail?.updated_at || item?.created_at || item?.updated_at;
  if (!t) return '';
  return String(t);
}

function safeParseDate(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeAiText(input: string) {
  const s = String(input || '').replace(/\r\n/g, '\n').trimStart();
  if (!s) return '';
  if (/无记录/.test(s)) return '你当日没有记录哦~';
  return s;
}

function getRecordUuid(record: CalendarRecord) {
  const uuid = record?.detail?.uuid;
  if (!uuid) return '';
  return String(uuid);
}

function extractTimelineList(res: any): TimelineRawItem[] {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data?.list)) return res.data.list;
  if (Array.isArray(res?.list)) return res.list;
  return [];
}

function buildCalendarGrid(month: Date, selectedDate: Date, recordsByDate: Record<string, CalendarRecord[]>) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const today = new Date();

  const cells: CalendarCell[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) {
    const key = format(cur, 'yyyy-MM-dd');
    const inCurrentMonth = isSameMonth(cur, month);
    const isToday = isSameDay(cur, today);
    const isSelected = isSameDay(cur, selectedDate);
    const records = recordsByDate[key] || [];
    cells.push({ date: cur, key, inCurrentMonth, isToday, isSelected, records });
    cur = addDays(cur, 1);
  }

  return cells;
}

function getRecordSummary(record: CalendarRecord) {
  const first = record.displayItems && record.displayItems.length > 0 ? record.displayItems[0] : null;
  if (first) return `${first.label}：${first.value}`;
  return record.typeName || '记录';
}

const Data = () => {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [pondLoading, setPondLoading] = useState(false);
  const [selectedPondId, setSelectedPondId] = useState<number | null>(null);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [monthLoading, setMonthLoading] = useState(false);
  const [recordsByDate, setRecordsByDate] = useState<Record<string, CalendarRecord[]>>({});

  const [aiSummaryText, setAiSummaryText] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState('');

  const [aiItemTextMap, setAiItemTextMap] = useState<Record<string, string>>({});
  const [aiItemLoadingMap, setAiItemLoadingMap] = useState<Record<string, boolean>>({});
  const [aiItemErrorMap, setAiItemErrorMap] = useState<Record<string, string>>({});
  const [aiItemExpandedMap, setAiItemExpandedMap] = useState<Record<string, boolean>>({});

  const [splitRatio, setSplitRatio] = useState(0.55);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    dragging: boolean;
    startY: number;
    startRatio: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      if (!state || !state.dragging) return;
      if (!state.height) return;
      const delta = e.clientY - state.startY;
      const next = state.startRatio + delta / state.height;
      const clamped = Math.min(0.8, Math.max(0.2, next));
      setSplitRatio(clamped);
    };

    const handleUp = () => {
      if (!dragStateRef.current) return;
      dragStateRef.current = { ...(dragStateRef.current || {}), dragging: false, startY: 0, startRatio: splitRatio, height: dragStateRef.current?.height || 0 };
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [splitRatio]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      dragging: true,
      startY: e.clientY,
      startRatio: splitRatio,
      height: rect.height,
    };
  };

  useEffect(() => {
    const run = async () => {
      setPondLoading(true);
      try {
        const list = await fetchDisplayPonds();
        setPonds(list);
        if (list.length > 0) {
          setSelectedPondId((prev) => prev ?? list[0].id);
        }
      } finally {
        setPondLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!selectedPondId) return;

    const run = async () => {
      setMonthLoading(true);
      try {
        const startTime = format(startOfMonth(month), 'yyyy-MM-dd 00:00:00');
        const endTime = format(endOfMonth(month), 'yyyy-MM-dd 23:59:59');

        const pageSize = 200;
        let page = 1;
        let hasMore = true;
        let all: TimelineRawItem[] = [];

        while (hasMore) {
          const res = await getTrendData({
            start_time: startTime,
            end_time: endTime,
            pond_id: selectedPondId,
            type: DEFAULT_EXPORT_TYPES,
            page,
            page_size: pageSize,
          });

          const list = extractTimelineList(res);
          all = all.concat(list);

          if (list.length < pageSize) {
            hasMore = false;
          } else {
            page += 1;
          }

          if (page > 50) {
            hasMore = false;
          }
        }

        const mapped = all
          .map((item) => {
            const detail = item?.detail || item;
            const type = String(item?.type || detail?.type || 'unknown');
            const rawTime = getRecordRawTime(detail, item, type);
            const dt = safeParseDate(rawTime);
            if (!dt) return null;

            const typeName = getRecordTypeChineseName(type);
            const icon = getRecordIcon(type);
            const displayItems = getFullDisplayItems(detail, type);

            return {
              id: detail?.id || detail?.uuid || item?.id || `${type}-${rawTime}-${Math.random()}`,
              rawTime,
              type,
              typeName,
              icon,
              displayItems,
              detail,
              _dateKey: format(dt, 'yyyy-MM-dd'),
              _timeMs: dt.getTime(),
            };
          })
          .filter(Boolean) as (CalendarRecord & { _dateKey: string; _timeMs: number })[];

        const grouped: Record<string, (CalendarRecord & { _dateKey: string; _timeMs: number })[]> = {};
        mapped.forEach((r) => {
          if (!grouped[r._dateKey]) grouped[r._dateKey] = [];
          grouped[r._dateKey].push(r);
        });

        const normalized: Record<string, CalendarRecord[]> = {};
        Object.entries(grouped).forEach(([dateKey, list]) => {
          normalized[dateKey] = list
            .sort((a, b) => b._timeMs - a._timeMs)
            .map(({ _timeMs, _dateKey, ...rest }) => rest);
        });

        setRecordsByDate(normalized);
      } finally {
        setMonthLoading(false);
      }
    };

    run();
  }, [selectedPondId, month]);

  const weekDays = useMemo(() => ['一', '二', '三', '四', '五', '六', '日'], []);

  const cells = useMemo(() => buildCalendarGrid(month, selectedDate, recordsByDate), [month, selectedDate, recordsByDate]);
  const selectedKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const selectedRecords = recordsByDate[selectedKey] || [];

  const selectedPond = useMemo(() => ponds.find((p) => p.id === selectedPondId) || null, [ponds, selectedPondId]);
  const selectedPondIsDemo = Boolean(selectedPond?.is_demo);

  useEffect(() => {
    setAiSummaryText('');
    setAiSummaryLoading(false);
    setAiSummaryError('');
    setAiItemTextMap({});
    setAiItemLoadingMap({});
    setAiItemErrorMap({});
    setAiItemExpandedMap({});
  }, [selectedPondId, selectedKey]);

  const handleGenerateSummary = async () => {
    if (!selectedPondId) return;
    const startStr = selectedKey;
    const endStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');

    setAiSummaryLoading(true);
    setAiSummaryError('');
    setAiSummaryText('');
    try {
      const res = await getAiAnalysisText({
        pond_id: selectedPondId,
        start_time: startStr,
        end_time: endStr,
        type: DEFAULT_EXPORT_TYPES,
        is_demo: selectedPondIsDemo,
      });
      const normalized = normalizeAiText(res.text);
      setAiSummaryText(normalized || '你当日没有记录哦~');
    } catch (e) {
      setAiSummaryError('AI因网络或模型问题暂无法服务，请稍后再试');
      setAiSummaryText('');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const handleAnalyseItem = async (record: CalendarRecord) => {
    if (!selectedPondId) return;
    const uuid = getRecordUuid(record);
    if (!uuid) {
      setAiItemErrorMap((prev) => ({ ...prev, [String(record.id)]: '该记录缺少uuid，暂无法进行AI分析' }));
      return;
    }

    setAiItemLoadingMap((prev) => ({ ...prev, [uuid]: true }));
    setAiItemErrorMap((prev) => ({ ...prev, [uuid]: '' }));
    try {
      const res = await getAnalysisItem({
        type: record.type,
        uuid,
        is_demo: selectedPondIsDemo,
      });
      const normalized = normalizeAiText(res.text);
      setAiItemTextMap((prev) => ({ ...prev, [uuid]: normalized || '你当日没有记录哦~' }));
      setAiItemExpandedMap((prev) => ({ ...prev, [uuid]: true }));
    } catch (e) {
      setAiItemErrorMap((prev) => ({ ...prev, [uuid]: 'AI因网络或模型问题暂无法服务，请稍后再试' }));
    } finally {
      setAiItemLoadingMap((prev) => ({ ...prev, [uuid]: false }));
    }
  };

  return (
    <div className="flex h-full bg-transparent overflow-hidden">
      <div className="w-72 shrink-0 bg-white rounded-md shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">塘口列表</h1>
          <div className="text-xs text-gray-500 mt-1 truncate">
            {selectedPond ? `当前：${selectedPond.name}` : '请选择塘口'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {pondLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="animate-spin w-5 h-5" />
            </div>
          ) : ponds.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-10">暂无塘口</div>
          ) : (
            <div className="space-y-2">
              {ponds.map((pond) => {
                const active = pond.id === selectedPondId;
                return (
                  <button
                    key={pond.id}
                    onClick={() => setSelectedPondId(pond.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left',
                      active ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                      <img
                        src={pond.picture_url || DEFAULT_ASSETS.POND_AVATAR}
                        alt={pond.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm font-semibold truncate', active ? 'text-blue-700' : 'text-gray-800')}>
                        {pond.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {pond.province}{pond.city}{pond.district}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 ml-3 bg-white rounded-md shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">养殖日历</h2>
            <span className="text-sm text-gray-500">{selectedPond ? selectedPond.name : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              aria-label="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-28 text-center font-semibold text-gray-800">
              {format(month, 'yyyy年MM月')}
            </div>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="h-9 w-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              aria-label="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={containerRef} className="flex-1 overflow-hidden flex flex-col">
          <div
            className="px-6 pt-4 pb-4 flex flex-col overflow-hidden"
            style={{ flexBasis: `${splitRatio * 100}%`, minHeight: '160px' }}
          >
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs text-gray-500 font-semibold py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-2 flex-1 overflow-y-auto custom-scrollbar">
              {monthLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="animate-spin w-6 h-6" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {cells.map((cell) => {
                    const firstTwo = cell.records.slice(0, 2);
                    const overflowCount = Math.max(0, cell.records.length - 2);
                    return (
                      <button
                        key={cell.key}
                        onClick={() => {
                          setSelectedDate(cell.date);
                          if (!isSameMonth(cell.date, month)) {
                            setMonth(startOfMonth(cell.date));
                          }
                        }}
                        className={cn(
                          'h-32 rounded-xl border p-2 flex flex-col text-left transition-colors overflow-hidden',
                          cell.inCurrentMonth ? 'bg-white' : 'bg-gray-50',
                          cell.isSelected
                            ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('text-sm font-semibold', cell.inCurrentMonth ? 'text-gray-800' : 'text-gray-400')}>
                            {format(cell.date, 'd')}
                          </span>
                          {cell.isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">今</span>
                          )}
                        </div>

                        <div className="mt-1 grid grid-rows-3 gap-1 min-h-0 flex-1">
                          {Array.from({ length: 2 }).map((_, idx) => {
                            const r = firstTwo[idx];
                            if (!r) return <div key={`empty-${idx}`} className="min-h-[22px]" />;
                            return (
                              <div
                                key={String(r.id)}
                                className="min-h-[22px] flex items-center gap-1.5 bg-[#e9f5fe] rounded-lg px-2 py-1"
                              >
                                <img src={r.icon} alt={r.typeName} className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[10px] text-gray-700 truncate">{getRecordSummary(r)}</span>
                              </div>
                            );
                          })}

                          {overflowCount > 0 ? (
                            <div className="min-h-[22px] flex items-center justify-center rounded-lg bg-[#e9f5fe] border border-dashed border-gray-200 text-[10px] text-gray-500">
                              +{overflowCount}
                            </div>
                          ) : (
                            <div className="min-h-[22px]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div
            onMouseDown={handleDragStart}
            className="h-2 cursor-row-resize bg-gray-50 border-t border-b border-gray-100 flex items-center justify-center"
          >
            <div className="w-12 h-0.5 rounded-full bg-gray-300" />
          </div>

          <div
            className="border-t border-gray-100 px-6 py-4 overflow-hidden flex flex-col"
            style={{ flexBasis: `${(1 - splitRatio) * 100}%`, minHeight: '120px' }}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900">{format(selectedDate, 'yyyy年MM月dd日')}</div>
              <div className="text-xs text-gray-500">共 {selectedRecords.length} 条记录</div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto custom-scrollbar">
              {selectedRecords.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center">当天暂无记录</div>
              ) : (
                <div className="space-y-2 pb-4">
                  {selectedRecords.map((r) => {
                    const dt = safeParseDate(r.rawTime);
                    const timeText = dt ? format(dt, 'HH:mm') : '--:--';
                    const preview = (r.displayItems || []).slice(0, 3);
                    const uuid = getRecordUuid(r);
                    const aiKey = uuid || String(r.id);
                    const aiText = uuid ? aiItemTextMap[uuid] : '';
                    const aiLoading = uuid ? Boolean(aiItemLoadingMap[uuid]) : false;
                    const aiError = uuid ? (aiItemErrorMap[uuid] || '') : (aiItemErrorMap[String(r.id)] || '');
                    const aiExpanded = uuid ? (aiItemExpandedMap[uuid] !== false) : true;
                    return (
                      <div key={String(r.id)} className="border border-gray-100 rounded-xl p-4 bg-[#e9f5fe] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-[#e9f5fe] flex items-center justify-center border border-gray-100 shrink-0">
                            <img src={r.icon} alt={r.typeName} className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-semibold text-gray-900 truncate">{r.typeName}</div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-xs text-gray-500">{timeText}</div>
                                <button
                                  type="button"
                                  disabled={!uuid || aiLoading}
                                  onClick={() => handleAnalyseItem(r)}
                                  className={cn(
                                    'h-7 px-2 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors',
                                    !uuid || aiLoading
                                      ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                                      : 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                                  )}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  AI分析
                                </button>
                              </div>
                            </div>
                            {preview.length === 0 ? (
                              <div className="text-xs text-gray-400 mt-1 truncate">无可展示字段</div>
                            ) : (
                              <div className="text-xs text-gray-600 mt-1 grid grid-cols-1 gap-1">
                                {preview.map((p, idx) => (
                                  <div key={`${String(r.id)}-${idx}`} className="truncate">
                                    {p.label}：{p.value}
                                  </div>
                                ))}
                              </div>
                            )}

                            {(aiLoading || aiError || aiText) && (
                              <div className="mt-3 bg-white/70 border border-white rounded-xl p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    AI分析
                                  </div>
                                  {aiText && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAiItemExpandedMap((prev) => ({
                                          ...prev,
                                          [aiKey]: !(prev[aiKey] !== false),
                                        }))
                                      }
                                      className="h-7 px-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5"
                                    >
                                      {aiExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      {aiExpanded ? '收起' : '展开'}
                                    </button>
                                  )}
                                </div>
                                {aiLoading ? (
                                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    分析中...
                                  </div>
                                ) : aiError ? (
                                  <div className="mt-2 text-xs text-red-600 whitespace-pre-line">{aiError}</div>
                                ) : aiExpanded ? (
                                  <div className="mt-2 text-xs text-gray-700 whitespace-pre-line">{aiText}</div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 border border-gray-100 rounded-xl p-4 bg-[#7b8fab]">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">AI总结</div>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={!selectedPondId || aiSummaryLoading}
                    className={cn(
                      'h-9 px-3 rounded-xl text-sm font-semibold border transition-colors',
                      !selectedPondId || aiSummaryLoading
                        ? 'border-white/30 bg-white/30 text-white/60 cursor-not-allowed'
                        : 'border-white/40 bg-white/20 text-white hover:bg-white/30'
                    )}
                  >
                    生成AI总结
                  </button>
                </div>

                <div className="mt-3 bg-white rounded-xl border border-gray-100 p-4">
                  {aiSummaryLoading ? (
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </div>
                  ) : aiSummaryError ? (
                    <div className="text-sm text-red-600 whitespace-pre-line">{aiSummaryError}</div>
                  ) : aiSummaryText ? (
                    <div className="text-sm text-gray-700 whitespace-pre-line">{aiSummaryText}</div>
                  ) : (
                    <div className="text-sm text-gray-500">点击“生成AI总结”，快速回顾当天养殖操作。</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Data;

