import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Download } from 'lucide-react';
import { Pond, getPondDetail } from '@/services/ponds';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Extended interfaces
interface PondStaff {
  id: number;
  name: string;
  avatar: string;
}

interface FarmingRecord {
  id: number;
  time: string;
  date: string;
  image?: string;
}

interface PondDetailInfo extends Pond {
  location?: string;
  max_depth?: string;
  breed_mode?: string;
  remark?: string;
  staffs?: PondStaff[];
  records?: FarmingRecord[];
}

const PondDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pond, setPond] = useState<PondDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
       setLoading(true);
       getPondDetail(id).then((data: any) => {
         // Map response to PondDetailInfo, providing defaults for missing fields
         setPond({
            ...data,
            location: data.location || '-', 
            max_depth: data.max_depth || '-',
            breed_mode: data.breed_mode || '-',
            remark: data.remark || '',
            staffs: data.staffs || [],
            records: data.records || []
         });
       }).catch(err => {
         console.error(err);
       }).finally(() => {
         setLoading(false);
       });
    }
  }, [id]);

  if (loading || !pond) return <div className="flex h-full items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-full flex-col bg-transparent overflow-hidden">
      {/* Top Header Row (Back) */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 shadow-sm z-10">
         <div className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-blue-600 transition-colors" onClick={() => navigate('/')}>
           <ChevronLeft size={20} />
           <span className="font-bold text-lg">{pond.name}</span>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Farming Records (Timeline) */}
        <div className="w-72 border-r border-gray-200 flex flex-col h-full bg-white shrink-0">
           <div className="p-4 pb-2">
             <h3 className="font-bold text-gray-900 text-lg">养殖记录</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="relative pl-2">
                 {/* Vertical Line */}
                 <div className="absolute left-[9px] top-2 bottom-0 w-[2px] bg-gray-300"></div>
                 
                 {pond.records && pond.records.length > 0 ? (
                   pond.records.map((record) => (
                   <div key={record.id} className="relative pl-8 mb-8 group">
                     {/* Circle Node */}
                     <div className="absolute left-0 top-0 w-5 h-5 bg-white border-2 border-gray-800 rounded-full z-10 box-border"></div>
                     
                     {/* Time & Date */}
                     <div className="text-sm font-medium text-gray-800 mb-1 leading-tight">
                       <div>{record.time}</div>
                       <div>{record.date}</div>
                     </div>
                     
                     {/* Content Card (Image) */}
                     <div className="mt-2 w-full h-28 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        {record.image ? (
                          <img src={record.image} alt="record" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">暂无图片</div>
                        )}
                     </div>
                   </div>
                   ))
                 ) : (
                   <div className="text-gray-400 text-sm pl-8">暂无记录</div>
                 )}
              </div>
           </div>
        </div>

        {/* Center Column: Trend Chart */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden bg-blue-50/30 relative">
           {/* Chart Title Overlay */}
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
              <span className="text-9xl font-black text-gray-900 tracking-widest" style={{ writingMode: 'horizontal-tb' }}>趋势图</span>
           </div>

           <div className="flex justify-between items-center mb-6 z-10">
              <h2 className="text-2xl font-bold text-gray-900">超势图</h2>
              {/* Optional: Date Range Picker or Controls could go here */}
           </div>

           <div className="flex-1 w-full min-h-0 z-10">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} dy={10} />
                 <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} />
                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 14 }} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                 />
                 <Line yAxisId="left" type="monotone" dataKey="pH" stroke="#ef4444" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                 <Line yAxisId="left" type="monotone" dataKey="do" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                 <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Right Column: Info & Staff */}
        <div className="w-72 border-l border-gray-200 flex flex-col h-full bg-white shrink-0 p-5 overflow-y-auto custom-scrollbar">
           {/* Staff Section */}
           <div className="mb-8">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">塘口人员</h3>
              <div className="grid grid-cols-4 gap-2">
                 {pond.staffs && pond.staffs.map((staff) => (
                   <div key={staff.id} className="flex flex-col items-center">
                      <div className="w-10 h-10 border border-gray-800 rounded-sm overflow-hidden mb-1">
                        <img src={staff.avatar} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{staff.name}</span>
                   </div>
                 ))}
                 {(!pond.staffs || pond.staffs.length === 0) && <div className="text-gray-400 text-sm">暂无人员</div>}
              </div>
           </div>

           {/* Pond Info Section */}
           <div className="mb-8 flex-1">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">塘口信息</h3>
              <div className="space-y-3 text-sm">
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">名称 :</span>
                   <span className="text-gray-900 font-medium">{pond.name}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖品种 :</span>
                   <span className="text-gray-900 font-medium">{pond.breed_species}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">位置 :</span>
                   <span className="text-gray-900 font-medium">{pond.location}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖面积 :</span>
                   <span className="text-gray-900 font-medium">{pond.surface_area}亩</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">最大水深 :</span>
                   <span className="text-gray-900 font-medium">{pond.max_depth}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">养殖方式 :</span>
                   <span className="text-gray-900 font-medium">{pond.breed_mode}</span>
                 </div>
                 <div className="flex">
                   <span className="text-gray-500 w-20 shrink-0">备注 :</span>
                   <span className="text-gray-900 font-medium">{pond.remark}</span>
                 </div>
              </div>
           </div>

           {/* Export Button */}
           <div className="mt-auto pt-4">
              <button className="w-full border border-gray-900 text-gray-900 rounded-lg py-2.5 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                 数据导出
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PondDetail;
