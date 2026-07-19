import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { User, CheckCircle, Plus, Edit, Trash2, X, Save } from 'lucide-react';

export default function UserList() {
  const { profile: loggedInProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddNew = () => {
    setFormData({
      id: null,
      username: '',
      ho_ten: '',
      vai_tro: 'nhan_vien',
      mat_khau: ''
    });
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setFormData({
      id: user.id,
      username: user.username || '',
      ho_ten: user.ho_ten || '',
      vai_tro: user.vai_tro || 'nhan_vien',
      mat_khau: user.mat_khau || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá người dùng "${name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccessMsg('Đã xoá người dùng!');
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Lỗi xoá người dùng: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.ho_ten) {
      alert('Vui lòng điền đủ tên đăng nhập và họ tên!');
      return;
    }

    setFormLoading(true);
    try {
      if (formData.id) {
        // Cập nhật
        const { error } = await supabase
          .from('profiles')
          .update({
            username: formData.username,
            ho_ten: formData.ho_ten,
            vai_tro: formData.vai_tro,
            mat_khau: formData.mat_khau || null
          })
          .eq('id', formData.id);
          
        if (error) throw error;
        setSuccessMsg('Cập nhật người dùng thành công!');
      } else {
        // Thêm mới
        const { error } = await supabase
          .from('profiles')
          .insert([{
            username: formData.username,
            ho_ten: formData.ho_ten,
            vai_tro: formData.vai_tro,
            mat_khau: formData.mat_khau || null
          }]);
          
        if (error) throw error;
        setSuccessMsg('Thêm người dùng mới thành công!');
      }
      
      setShowForm(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Lỗi lưu người dùng: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <div className="title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Quản trị Người dùng & Phân quyền</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý tài khoản và mật khẩu của nhân viên
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Thêm người dùng
          </button>
        )}
      </div>

      {successMsg && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          backgroundColor: 'var(--success-glow)', color: 'var(--success)', 
          padding: '12px 16px', borderRadius: 'var(--radius-sm)', 
          marginBottom: '20px', fontWeight: '500', fontSize: '0.9rem',
          border: '1px solid rgba(16, 185, 129, 0.1)'
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {showForm && formData ? (
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formData.id ? 'Sửa thông tin người dùng' : 'Thêm người dùng mới'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Tên đăng nhập *</label>
                <input 
                  type="text" className="form-control" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  placeholder="Ví dụ: nguyenvan_a" required
                />
              </div>
              <div className="form-group">
                <label>Họ và tên *</label>
                <input 
                  type="text" className="form-control" 
                  value={formData.ho_ten} 
                  onChange={e => setFormData({...formData, ho_ten: e.target.value})} 
                  placeholder="Ví dụ: Nguyễn Văn A" required
                />
              </div>
              <div className="form-group">
                <label>Vai trò</label>
                <select 
                  className="form-control"
                  value={formData.vai_tro}
                  onChange={e => setFormData({...formData, vai_tro: e.target.value})}
                >
                  <option value="nhan_vien">Nhân viên</option>
                  <option value="quan_ly_kho">Quản lý kho</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input 
                  type="text" className="form-control" 
                  value={formData.mat_khau} 
                  onChange={e => setFormData({...formData, mat_khau: e.target.value})} 
                  placeholder="Nhập mật khẩu cho tài khoản" 
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={formLoading} style={{ display: 'flex', alignItems: 'center' }}>
                <Save size={18} style={{ marginRight: '6px' }}/> {formLoading ? 'Đang lưu...' : 'Lưu lại'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)} style={{ display: 'flex', alignItems: 'center' }}>
                <X size={18} style={{ marginRight: '6px' }}/> Hủy
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {loading && !showForm ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>
          <div className="spinner"></div>
          <p>Đang tải danh sách thành viên...</p>
        </div>
      ) : !showForm ? (
        <>
          <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>Chưa có người dùng nào.</div>
            ) : (
              users.map((u) => {
                const isSelf = u.id === loggedInProfile?.id;
                return (
                  <div key={u.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Họ tên: {u.ho_ten} {isSelf && <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>(Bạn)</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} />
                        Tên đăng nhập: {u.username || 'Chưa có'}
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', textAlign: 'right' }}>
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => setSelectedUser(u)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Modal Chi tiết User */}
          {selectedUser && (
            <div className="modal-overlay" onClick={() => setSelectedUser(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                  <h3 style={{ margin: 0 }}>Chi tiết người dùng</h3>
                  <button className="btn btn-icon-only btn-secondary" onClick={() => setSelectedUser(null)} style={{ border: 'none', background: 'transparent' }}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Họ và tên</label>
                    <div style={{ fontWeight: '600' }}>{selectedUser.ho_ten}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tên đăng nhập</label>
                    <div>{selectedUser.username}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Vai trò</label>
                    <span className={`badge ${
                      selectedUser.vai_tro === 'admin' ? 'danger' : 
                      selectedUser.vai_tro === 'quan_ly_kho' ? 'info' : 'success'
                    }`}>
                      {selectedUser.vai_tro === 'admin' ? 'Quản trị viên' : 
                       selectedUser.vai_tro === 'quan_ly_kho' ? 'Quản lý kho' : 'Nhân viên'}
                    </span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mật khẩu</label>
                    <div>{selectedUser.mat_khau ? <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>{selectedUser.mat_khau}</span> : <span className="text-muted">Chưa đặt</span>}</div>
                  </div>
                </div>
                
                <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))', gap: '12px', backgroundColor: '#fff' }}>
                  {selectedUser.id !== loggedInProfile?.id && (
                    <button 
                      className="btn btn-outline" 
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }} 
                      onClick={() => {
                        const u = selectedUser;
                        setSelectedUser(null);
                        handleDelete(u.id, u.ho_ten);
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Xóa</span>
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      const u = selectedUser;
                      setSelectedUser(null);
                      handleEdit(u);
                    }}
                  >
                    <Edit size={16} />
                    <span>Sửa</span>
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    onClick={() => setSelectedUser(null)}
                  >
                    <X size={16} />
                    <span>Đóng</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
