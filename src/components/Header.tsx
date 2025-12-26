import { useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserInfo } from '@/services/users';

/**
 * 头部组件 (Header)
 * 作用：应用顶部导航栏，显示Logo、用户信息及退出登录按钮。
 * 输入：无 (使用 useUserStore 获取全局用户状态)
 * 输出：顶部导航 UI
 * 逻辑：
 *  1. 初始化时获取最新用户信息 (fetchUserInfo)
 *  2. 处理退出登录 (handleLogout)
 * 样式：
 *  - 固定定位 fixed top-0
 *  - 白色背景 bg-white
 *  - 底部深色边框 border-b-4 (视觉强调)
 */
const Header = () => {
  const { user, logout, setUser } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user?.user_id) {
        try {
          const res = await getUserInfo(user.user_id);
          if (res && res.data) {
             setUser({ ...user, ...res.data });
          }
        } catch (error) {
          console.error('Failed to fetch user info:', error);
        }
      }
    };
    
    fetchUserInfo();
  }, [user?.user_id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b-4 border-[#38393c] flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Logo" className="w-8 h-8 rounded-full shadow-sm object-cover" />
        ) : (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
               <span className="text-xs font-bold">虾</span>
            </div>
        )}
        <span className="text-blue-600 font-bold text-xl">{user?.nickname || '智能养虾'}</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm">
             {user?.avatar_url ? (
                <img src={user.avatar_url} alt="User" className="w-6 h-6 rounded-full object-cover" />
             ) : (
                <User size={16} />
             )}
            <span>{user?.nickname || '用户'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors"
          >
            <LogOut size={12} />
            退出登录
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
