import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';

const ProtectedRoute = () => {
  const token = useUserStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
