import React, { useMemo } from 'react';
import { useUserStore } from '@/store/useUserStore';

const PhoneWatermark: React.FC = () => {
  const user = useUserStore((state) => state.user);
  
  const phone = useMemo(() => {
    // 尝试从多个字段获取手机号
    const raw = user?.phone || (user as any)?.mobile || '';
    const phoneStr = String(raw);
    
    // 过滤无效值
    if (!phoneStr || phoneStr === 'undefined' || phoneStr === 'null') return '';
    
    return phoneStr;
  }, [user]);

  if (!phone) {
    return null;
  }

  const rows = 4;
  const cols = 6;
  const items = Array.from({ length: rows * cols });

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none overflow-hidden">
      <div className="absolute -inset-16">
        {items.map((_, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const top = (row + 0.5) * (100 / rows);
          const left = (col + 0.5) * (100 / cols);

          return (
            <div
              key={index}
              className="absolute text-[18px] font-semibold text-[#dadada] opacity-50 whitespace-nowrap tracking-[0em]"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                transform: 'translate(-50%, -50%) rotate(-30deg)',
              }}
            >
              {phone}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PhoneWatermark;
