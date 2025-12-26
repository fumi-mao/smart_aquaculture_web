import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { LogOut, User, AlertCircle } from 'lucide-react';
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const handleLogoutClick = () => {
    setShowLogoutConfirm(!showLogoutConfirm);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  // Click outside to close the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showLogoutConfirm && !target.closest('.logout-container')) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutConfirm]);

  return (
    <header className="h-14 bg-white border-b-4 border-[#38393c] flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/favicon.svg" alt="Logo" className="w-8 h-8 object-contain" />
        <img src="/tangqianyan-text.svg" alt="塘前眼" className="h-6 object-contain" />
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
          
          <div className="relative logout-container">
            <button 
              onClick={handleLogoutClick}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${showLogoutConfirm ? 'bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
            >
              <LogOut size={12} />
              退出登录
            </button>

            {/* Logout Confirmation Popover */}
            {showLogoutConfirm && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-gray-600 font-medium text-center mb-1">确认要退出登录吗?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
                    >
                      取消
                    </button>
                    <button 
                      onClick={confirmLogout}
                      className="flex-1 py-1.5 px-2 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors"
                    >
                      确认
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
