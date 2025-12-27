import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import PhoneWatermark from './PhoneWatermark';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

/**
 * 布局组件 (Layout)
 * 作用：整个应用的主布局容器，包含头部、侧边栏和主内容区域。
 * 输入：
 *  - children: ReactNode (页面内容)
 *  - showSidebar: boolean (是否显示侧边栏，默认为 true)
 * 输出：带有统一布局结构的 HTML 结构
 * 样式：
 *  - 全屏高度 h-screen
 *  - 背景色 #fafafa (缓冲地带颜色)
  *  - Flex 布局，包含头部和下方的左右分栏
  *  - 增加各个区域之间的间距 gap-3
  *  - 增加外边距 padding
  */
const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  return (
    // 修改：背景色改为 #fafafa
    <div className="h-screen bg-[#fafafa] flex flex-col">
      <Header />
      {/* 修改：
          - pt-16: 顶部内边距 (Header 3.5rem + 0.5rem gap)
          - px-3 pb-3: 左右和底部内边距，减小缓冲带
          - gap-3: 侧边栏与主内容之间的间距 (12px)
      */}
      <div className="flex flex-1 overflow-hidden pt-16 px-3 pb-3 gap-3">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-hidden relative rounded-md">
          <PhoneWatermark />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
