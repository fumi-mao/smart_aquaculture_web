import React, { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { getUserInfo } from '@/services/users';
import { Pond } from '@/services/ponds';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DEFAULT_ASSETS } from '@/config';
import { fetchAllGroups } from '@/utils/groupsLoader';
import { fetchDisplayPonds } from '@/utils/pondLoader';

interface PondStats {
  created: number;
  joined: number;
}

const COLORS = ['#3b82f6', '#f97316'];

const Profile: React.FC = () => {
  const { user, setUser } = useUserStore();
  const [loadingUser, setLoadingUser] = useState(false);
  const [stats, setStats] = useState<PondStats>({ created: 0, joined: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!user?.user_id) return;
      setLoadingUser(true);
      try {
        const res = await getUserInfo(user.user_id);
        if (res && res.data) {
          setUser({ ...user, ...res.data });
        }
      } catch (e) {
        console.error('Failed to fetch user info in profile:', e);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [user?.user_id]);

  const calculateStats = (ponds: any[], groups: any[]) => {
    const allPondIds = new Set<number>();
    ponds.forEach((p: any) => {
      if (p && p.id != null) {
        allPondIds.add(Number(p.id));
      }
    });

    const created = new Set<number>();
    const joined = new Set<number>();
    const currentUserId = Number((user as any).user_id || (user as any).id);
    let avatarFromGroups = '';

    (groups || []).forEach((g: any) => {
      if (!g || g.pond_id == null) return;
      const pondId = Number(g.pond_id);
      
      if (!allPondIds.has(pondId)) return;

      const ownerId = Number(g.group_owner_id);

      if (ownerId && ownerId === currentUserId) {
        created.add(pondId);
      } else {
        joined.add(pondId);
      }

      const members = Array.isArray(g.user_ids) ? g.user_ids : [];
      const self = members.find((m: any) => String(m.id) === String(currentUserId));
      if (self && self.avatar_url && !avatarFromGroups) {
        avatarFromGroups = self.avatar_url;
      }
    });

    // 兜底：如果有些塘口在展示列表中但没有匹配到 group（或者是创建者），归类为创建
    allPondIds.forEach((id) => {
      if (!created.has(id) && !joined.has(id)) {
        created.add(id);
      }
    });

    if (avatarFromGroups && user) {
      const hasAvatar = !!(user.avatar_url || (user as any).picture_url);
      if (!hasAvatar || user.avatar_url !== avatarFromGroups) {
        setUser({ ...user, avatar_url: avatarFromGroups });
      }
    }

    setStats({ created: created.size, joined: joined.size });
  };

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.user_id) return;
      setLoadingStats(true);
      
      const groupsPromise = fetchAllGroups();
      const displayPondsPromise = fetchDisplayPonds();
      
      // 1. 尝试从缓存加载 Ponds，并结合实时的 Groups
      const cached = localStorage.getItem('cached_ponds_data');
      if (cached) {
          try {
              const { ponds: cachedPonds } = JSON.parse(cached);
              if (Array.isArray(cachedPonds)) {
                  // 等待 groups 返回
                  const groups = await groupsPromise;
                  calculateStats(cachedPonds, groups);
                  // 缓存命中且计算成功后，结束 loading
                  setLoadingStats(false); 
              }
          } catch (e) {
              console.warn('Failed to parse cached ponds', e);
          }
      }

      try {
        // 2. 等待最新的 Ponds 数据
        const [ponds, groups] = await Promise.all([
          displayPondsPromise,
          groupsPromise 
        ]);
        
        calculateStats(ponds, groups);
        
        // 更新缓存
        localStorage.setItem('cached_ponds_data', JSON.stringify({
             timestamp: Date.now(),
             ponds: ponds
        }));
        
      } catch (e) {
        console.error('Failed to load pond statistics:', e);
        if (!cached) {
            setStats({ created: 0, joined: 0 });
        }
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, [user?.user_id]);

  const avatarSrc = useMemo(() => {
    if (!user) return DEFAULT_ASSETS.USER_AVATAR;
    return user.avatar_url || user.picture_url || DEFAULT_ASSETS.USER_AVATAR;
  }, [user]);

  const nickname = user?.nickname || '用户';
  const phone = useMemo(() => {
    // 尝试从多个字段获取手机号
    const raw = user?.phone || (user as any)?.mobile || '';
    const phoneStr = String(raw);
    
    if (!phoneStr || phoneStr === 'undefined' || phoneStr === 'null') return '';
    
    return phoneStr;
  }, [user]);

  const totalPonds = stats.created + stats.joined;
  const pieData = useMemo(
    () =>
      totalPonds > 0
        ? [
            { name: '我创建的塘口', value: stats.created },
            { name: '我加入的塘口', value: stats.joined }
          ]
        : [],
    [stats.created, stats.joined, totalPonds]
  );

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-none px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
        <p className="text-gray-500 text-sm mt-1">查看我的基本信息与养殖概览</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
            <div className="w-32 h-32 rounded-3xl border border-gray-200 overflow-hidden flex items-center justify-center mb-6 bg-gray-50">
              <img src={avatarSrc} alt="用户头像" className="w-full h-full object-cover" />
            </div>
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">昵称</span>
                <span className="text-gray-900 font-medium truncate max-w-[200px] text-right">{nickname}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">手机号</span>
                <span className="text-gray-900 font-medium truncate max-w-[200px] text-right">
                  {loadingUser ? '加载中...' : phone || '未绑定'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">我的养殖记录</h2>
                <p className="text-xs text-gray-500 mt-1">
                  我创建的塘口：{stats.created} 个，我加入的塘口：{stats.joined} 个
                </p>
              </div>
              <div className="text-xs text-gray-400">
                总塘口数：
                <span className="font-semibold text-gray-700">{totalPonds}</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {loadingStats ? (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  正在加载养殖数据...
                </div>
              ) : totalPonds === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm">
                  <span>暂无塘口数据</span>
                  <span className="mt-1">请先创建或加入塘口</span>
                </div>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="40%"
                        cy="50%"
                        outerRadius={110}
                        label={(entry) =>
                          `${entry.name} ${(entry.value && totalPonds ? Math.round((entry.value / totalPonds) * 100) : 0)}%`
                        }
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} 个`, '数量']}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
