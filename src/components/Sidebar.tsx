import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bell, 
  Settings,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 侧边栏菜单配置
 * 根据需求移除：塘口管理、养殖记录、数据分析、AI助手
 * 新增：数据导出
 */
const menuItems = [
  { icon: LayoutDashboard, label: '首页', path: '/' },
  { icon: FileDown, label: '数据导出', path: '/data-export' },
  { icon: Bell, label: '提醒事项', path: '/reminders' },
  { icon: Settings, label: '个人中心', path: '/profile' },
];

/**
 * 侧边栏组件 (Sidebar)
 * 作用：显示应用的主要导航菜单，允许用户在不同功能模块间切换。
 * 输入：无 (使用内部配置的 menuItems)
 * 输出：渲染侧边栏 UI
 * 样式：
 *  - 固定宽度 w-64
  *  - 白色背景 bg-white
  *  - 圆角 rounded-md (美化，调整为更小圆角)
  *  - 阴影 shadow-sm (立体感)
  *  - 移除右边框 (使用间距分隔)
  */
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    // 修改：移除 border-r，添加 rounded-md, shadow-sm, my-0 (高度由父容器控制)
    <div className="w-64 h-full bg-white rounded-md shadow-sm flex flex-col shrink-0 overflow-hidden">
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
