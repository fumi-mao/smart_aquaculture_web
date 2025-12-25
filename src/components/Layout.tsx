import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen bg-[#f0f5f9] flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden pt-14">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
