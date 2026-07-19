import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireRole } from './auth/RequireAuth';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DanhMucList from './pages/DanhMuc/DanhMucList';
import DangKyList from './pages/DangKySD/DangKyList';
import DangKyForm from './pages/DangKySD/DangKyForm';
import KiemKeList from './pages/KiemKe/KiemKeList';
import KiemKeForm from './pages/KiemKe/KiemKeForm';
import KiemKeChiTiet from './pages/KiemKe/KiemKeChiTiet';
import UserList from './pages/QuanTri/UserList';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Guarded routes under AppLayout */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="danh-muc" element={<DanhMucList />} />
          <Route path="dang-ky-su-dung" element={<DangKyList />} />
          <Route path="dang-ky-su-dung/moi" element={<DangKyForm />} />
          <Route path="kiem-ke" element={<KiemKeList />} />
          <Route path="kiem-ke/moi" element={<KiemKeForm />} />
          <Route path="kiem-ke/chi-tiet/:date" element={<KiemKeChiTiet />} />
          
          {/* Admin only route */}
          <Route 
            path="quan-tri/nguoi-dung" 
            element={
              <RequireRole roles={['admin']}>
                <UserList />
              </RequireRole>
            } 
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
