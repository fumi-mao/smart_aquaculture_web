import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f5f9] to-[#dbeafe] pt-14">
      <Header />
      <main className="h-[calc(100vh-3.5rem)] overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
