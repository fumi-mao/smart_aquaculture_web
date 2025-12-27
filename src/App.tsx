import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import PondDetail from '@/pages/PondDetail';
import DataExport from '@/pages/DataExport';
import Profile from '@/pages/Profile';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pond/:id" element={<Layout showSidebar={false}><PondDetail /></Layout>} />
          <Route path="/data-export" element={<Layout><DataExport /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
