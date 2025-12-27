import React, { useEffect, useMemo, useState } from 'react';
import { Pond, getRecentWaterQuality } from '@/services/ponds';
import { fetchDisplayPonds } from '@/utils/pondLoader';
import { DEFAULT_EXPORT_TYPES, startExport, downloadExport } from '@/services/export';
import { downloadBinaryFile } from '@/utils/download';
import { format } from 'date-fns';
import PondCard from '@/components/PondCard';

const DataExport = () => {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [startTime] = useState('1999-01-01 00:00:00');
  const [endTime] = useState('2029-01-31 00:00:00');
  const [waterQualityData, setWaterQualityData] = useState<Record<number, any[]>>({});
  const [loadingWaterQuality, setLoadingWaterQuality] = useState(false);

  useEffect(() => {
    // 1. 尝试从缓存加载
    const cached = localStorage.getItem('cached_ponds_data');
    if (cached) {
      try {
        const { ponds: cachedPonds } = JSON.parse(cached);
        if (Array.isArray(cachedPonds)) {
          setPonds(cachedPonds);
          // 缓存加载后，后台获取水质
          fetchAllWaterQuality(cachedPonds);
        }
      } catch (e) {
        console.warn('Failed to parse cached ponds', e);
      }
    }

    const fetch = async () => {
      if (!cached) setLoading(true);
      try {
        // 使用统一的方法获取所有塘口（我创建的 + 我加入的）
        const list = await fetchDisplayPonds();
        setPonds(list);
        
        // 更新缓存
        localStorage.setItem('cached_ponds_data', JSON.stringify({
             timestamp: Date.now(),
             ponds: list
        }));

        if (list.length > 0) {
          fetchAllWaterQuality(list);
        }
      } catch {
        if (!cached) setPonds([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const allSelected = useMemo(() => ponds.length > 0 && selected.size === ponds.length, [ponds, selected]);

  const fetchAllWaterQuality = async (pondList: Pond[]) => {
    if (!pondList || pondList.length === 0) return;
    setLoadingWaterQuality(true);
    try {
      const tasks = pondList.map(pond =>
        getRecentWaterQuality(pond.id, 2)
          .then(res => ({ id: pond.id, data: res.data || [] }))
          .catch(() => ({ id: pond.id, data: [] }))
      );
      const results = await Promise.all(tasks);
      const map: Record<number, any[]> = {};
      results.forEach(item => {
        map[item.id] = item.data;
      });
      setWaterQualityData(map);
    } finally {
      setLoadingWaterQuality(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ponds.map(p => p.id)));
    }
  };

  const handleExport = async () => {
    if (exporting || selected.size === 0) return;
    setExporting(true);
    try {
      for (const id of Array.from(selected)) {
        const startRes = await startExport({
          type: DEFAULT_EXPORT_TYPES,
          pond_id: id,
          start_time: startTime,
          end_time: endTime
        });
        const jobId = startRes?.job_id || startRes?.data?.job_id || startRes;
        if (!jobId) continue;
        const res = await downloadExport(jobId);
        const pondName = ponds.find(p => p.id === id)?.name || 'pond';
        const ts = format(new Date(), 'yyyyMMdd_HHmm');
        downloadBinaryFile(`${pondName}_${id}_${ts}.xlsx`, res.data);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex items-center justify-between px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导出</h1>
          <p className="text-gray-500 text-sm mt-1">选择塘口并下载报表</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className={`px-3 py-2 rounded-lg border text-sm ${allSelected ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'}`}
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selected.size === 0}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${exporting || selected.size === 0 ? 'bg-gray-300 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {exporting ? '导出中...' : '导出 Excel 报表'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ponds.map(pond => {
              const checked = selected.has(pond.id);
              return (
                <PondCard
                  key={pond.id}
                  pond={pond}
                  waterQualityData={waterQualityData[pond.id]}
                  loadingData={loadingWaterQuality && !waterQualityData[pond.id]}
                  selected={checked}
                  selectable
                  onToggleSelect={() => toggleSelect(pond.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExport;
