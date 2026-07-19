import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải thông tin xác thực...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const RequireRole = ({ roles, children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  if (!profile || !roles.includes(profile.vai_tro)) {
    return <Navigate to="/" replace />;
  }

  return children;
};
