import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import PondDetail from '@/pages/PondDetail';
import Data from '@/pages/Data';
import DataExport from '@/pages/DataExport';
import Profile from '@/pages/Profile';
import UserAgreement from '@/pages/UserAgreement';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/legal/user-agreement" element={<UserAgreement />} />
        <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/pond/:id" element={<Layout showSidebar={false}><PondDetail /></Layout>} />
          <Route path="/data" element={<Layout><Data /></Layout>} />
          <Route path="/data-export" element={<Layout><DataExport /></Layout>} />
          <Route path="/profile" element={<Layout><Profile /></Layout>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
