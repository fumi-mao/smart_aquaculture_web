import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Fish, 
  ClipboardList, 
  LineChart, 
  Bot, 
  Bell, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: '首页', path: '/' },
  { icon: Fish, label: '塘口管理', path: '/ponds' },
  { icon: ClipboardList, label: '养殖记录', path: '/records' },
  { icon: LineChart, label: '数据分析', path: '/analysis' },
  { icon: Bot, label: 'AI 助手', path: '/ai-chat' },
  { icon: Bell, label: '提醒事项', path: '/reminders' },
  { icon: Settings, label: '个人中心', path: '/profile' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col shrink-0">
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 text-sm mb-1">需要帮助?</h4>
          <p className="text-xs text-blue-700 mb-3">联系我们的技术支持团队获取帮助</p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">
            联系客服
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
