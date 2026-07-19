import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { 
  LayoutDashboard, 
  ClipboardList, 
  PlusCircle, 
  ClipboardCheck, 
  Users, 
  LogOut, 
  Activity,
  Menu,
  User,
  Key,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert('Vui lòng nhập mật khẩu mới!');
      return;
    }
    
    setPasswordLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mat_khau: newPassword })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      alert('Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      alert('Có lỗi xảy ra: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const menuItems = [
    { path: '/', label: 'Trang chủ', icon: LayoutDashboard, roles: ['admin', 'quan_ly_kho', 'nhan_vien'] },
    { path: '/danh-muc', label: 'Danh mục', icon: ClipboardList, roles: ['admin', 'quan_ly_kho', 'nhan_vien'] },
    { path: '/dang-ky-su-dung', label: 'Đăng ký SD', icon: PlusCircle, roles: ['admin', 'quan_ly_kho', 'nhan_vien'] },
    { path: '/kiem-ke', label: 'Kiểm kê', icon: ClipboardCheck, roles: ['admin', 'quan_ly_kho', 'nhan_vien'] },
    { path: '/quan-tri/nguoi-dung', label: 'Quản trị', icon: Users, roles: ['admin'] }
  ];

  const visibleMenuItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.vai_tro)
  );

  return (
    <div className="app-container">
      {/* Sidebar for Desktop */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Activity size={28} />
          <h1>Kho VTYT</h1>
        </div>
        <nav style={{ flexGrow: 1 }}>
          <ul className="sidebar-menu">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                               (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <li key={item.path} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                  <NavLink to={item.path}>
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info" style={{ cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'background-color 0.2s' }} onClick={() => setShowPasswordModal(true)} title="Đổi mật khẩu">
            <span className="user-name">{profile?.ho_ten || 'Tài khoản'}</span>
            <span className="user-role">
              {profile?.vai_tro === 'admin' ? 'Quản trị viên' : 
               profile?.vai_tro === 'quan_ly_kho' ? 'Quản lý kho' : 'Nhân viên'}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-header" style={{ justifyContent: 'space-between', padding: '0 16px' }}>
        <div 
          className="mobile-user-profile" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '20px' }}
          onClick={() => setShowPasswordModal(true)}
        >
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{profile?.username || 'user'}</span>
          </div>
        </div>
        <div className="mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={20} style={{ color: 'var(--primary-light)' }} />
          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>Kho VTYT</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="bottom-nav">
        {visibleMenuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                           (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Modal Đổi mật khẩu */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '350px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} /> Đổi mật khẩu
              </h3>
              <button className="btn btn-icon-only btn-secondary" onClick={() => setShowPasswordModal(false)} style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword}>
              <div style={{ padding: '20px' }}>
                <div className="form-group">
                  <label>Tài khoản</label>
                  <input type="text" className="form-control" value={profile?.username || ''} disabled style={{ backgroundColor: 'var(--bg-main)' }} />
                </div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Mật khẩu mới</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Nhập mật khẩu mới" 
                    required 
                    autoFocus
                  />
                </div>
              </div>
              
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
