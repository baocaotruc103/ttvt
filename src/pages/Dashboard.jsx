import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  PlusCircle, 
  RefreshCw, 
  Truck,
  Eye
} from 'lucide-react';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [chuaLinhList, setChuaLinhList] = useState([]);
  const [chuaLinhCount, setChuaLinhCount] = useState(0);
  const [thieuList, setThieuList] = useState([]);
  const [thieuCount, setThieuCount] = useState(0);
  const [totalVtytCount, setTotalVtytCount] = useState(0);
  const [chuaKiemKeList, setChuaKiemKeList] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get dang_ky_sd count and list (limit 5)
      const { data: clData, count: clCount } = await supabase
        .from('dang_ky_sd')
        .select('*', { count: 'exact' })
        .eq('da_linh', false)
        .order('ngay_dang_ky', { ascending: true })
        .limit(5);

      setChuaLinhList(clData || []);
      setChuaLinhCount(clCount || 0);

      // 2. Get v_kiem_ke_moi_nhat where status is 'Thiếu'
      const { data: kkData, count: kkCount } = await supabase
        .from('v_kiem_ke_moi_nhat')
        .select('*', { count: 'exact' })
        .eq('tinh_trang', 'Thiếu')
        .order('thua_thieu', { ascending: true }); // most negative first

      setThieuList(kkData || []);
      setThieuCount(kkCount || 0);

      // 3. Get total active items count
      const { data: dmData, count: dmCount } = await supabase
        .from('danh_muc')
        .select('*', { count: 'exact' })
        .eq('trang_thai', 'Còn hàng');

      setTotalVtytCount(dmCount || 0);

      // 4. Calculate un-audited items
      const { data: allAudits } = await supabase
        .from('kiem_ke')
        .select('vat_tu_id');

      const auditedIds = new Set((allAudits || []).map(a => a.vat_tu_id));
      const neverAudited = (dmData || []).filter(item => !auditedIds.has(item.id));
      setChuaKiemKeList(neverAudited);

    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLinhBu = async (id) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('dang_ky_sd')
        .update({ da_linh: true, ngay_linh: todayStr })
        .eq('id', id);

      if (error) throw error;
      fetchData(); // reload
    } catch (err) {
      alert('Không thể cập nhật trạng thái lĩnh bù: ' + err.message);
    }
  };

  if (loading && totalVtytCount === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="title-container">
        <div>
          <h2>Tổng quan Kho VTYT</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Xin chào, <strong>{profile?.ho_ten}</strong> ({profile?.vai_tro === 'admin' ? 'Quản trị viên' : profile?.vai_tro === 'quan_ly_kho' ? 'Quản lý kho' : 'Nhân viên'})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchData} title="Tải lại dữ liệu">
            <RefreshCw size={18} />
            <span className="hide-mobile">Làm mới</span>
          </button>
          {/* <button className="btn btn-primary" onClick={() => navigate('/dang-ky-su-dung/moi')}>
            <PlusCircle size={18} />
            <span>Đăng ký sử dụng</span>
          </button> */}
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="stat-cards-container">
        <div 
          className="card stat-card warning" 
          onClick={() => navigate('/dang-ky-su-dung')}
        >
          <div className="stat-card-info">
            <span className="stat-card-title">Đăng ký chưa lĩnh</span>
            <span className="stat-card-value">{chuaLinhCount}</span>
          </div>
          <div className="stat-card-icon">
            <Truck size={28} />
          </div>
        </div>

        <div 
          className={`card stat-card ${thieuCount > 0 ? 'danger' : 'success'}`} 
          onClick={() => navigate('/kiem-ke')}
        >
          <div className="stat-card-info">
            <span className="stat-card-title">Vật tư thiếu hụt</span>
            <span className="stat-card-value">{thieuCount}</span>
          </div>
          <div className="stat-card-icon">
            <AlertTriangle size={28} />
          </div>
        </div>

        <div 
          className="card stat-card info" 
          onClick={() => navigate('/danh-muc')}
        >
          <div className="stat-card-info">
            <span className="stat-card-title">Danh mục đang dùng</span>
            <span className="stat-card-value">{totalVtytCount}</span>
          </div>
          <div className="stat-card-icon">
            <Package size={28} />
          </div>
        </div>

        <div 
          className="card stat-card warning" 
          onClick={() => navigate('/kiem-ke/moi')}
        >
          <div className="stat-card-info">
            <span className="stat-card-title">Chưa kiểm kê</span>
            <span className="stat-card-value">{chuaKiemKeList.length}</span>
          </div>
          <div className="stat-card-icon">
            <CheckCircle size={28} />
          </div>
        </div>
      </div>

      {/* Core Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Registrations waiting pickup */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Đăng ký chưa lĩnh bù</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dang-ky-su-dung')}>
              Xem tất cả
            </button>
          </div>

          {chuaLinhList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} style={{ color: 'var(--success)', marginBottom: '8px' }} />
              <p>Tất cả đăng ký sử dụng đã được lĩnh bù đầy đủ.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Ngày đăng ký</th>
                    <th>Tên vật tư</th>
                    <th>SL</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {chuaLinhList.map(item => (
                    <tr key={item.id}>
                      <td data-label="Ngày đăng ký">{item.ngay_dang_ky}</td>
                      <td data-label="Tên vật tư" style={{ fontWeight: '500' }}>
                        {item.danh_muc?.ten_vtyt || 'Đang tải...'}
                      </td>
                      <td data-label="SL">{item.so_luong} {item.danh_muc?.dvt}</td>
                      <td data-label="Hành động">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleLinhBu(item.id)}
                        >
                          Lĩnh bù
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Missing inventory chart & alerts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Thiếu hụt so với cơ số</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/kiem-ke')}>
              Lịch sử kiểm kê
            </button>
          </div>

          {thieuList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} style={{ color: 'var(--success)', marginBottom: '8px' }} />
              <p>Số lượng thực tế tại tủ trực đảm bảo cơ số tối thiểu.</p>
            </div>
          ) : (
            <div className="chart-container">
              {thieuList.slice(0, 5).map(item => {
                // Calculate percentage of actual stock vs regular co_so
                const percentage = Math.min(100, Math.round((item.tong_so_luong / item.co_so) * 100));
                
                return (
                  <div key={item.id} className="chart-row">
                    <span className="chart-label" title={item.ten_vtyt}>
                      {item.ten_vtyt}
                    </span>
                    <div className="chart-bar-outer">
                      <div 
                        className="chart-bar-inner" 
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: percentage < 40 ? 'var(--danger)' : 'var(--warning)' 
                        }}
                      ></div>
                    </div>
                    <span className="chart-value">
                      {item.tong_so_luong}/{item.co_so}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Un-audited list warnings */}
          {chuaKiemKeList.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.95rem', marginBottom: '12px' }}>
                <AlertTriangle size={18} />
                Vật tư y tế chưa được kiểm kê
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {chuaKiemKeList.slice(0, 6).map(item => (
                  <span key={item.id} className="badge warning" style={{ cursor: 'pointer' }} onClick={() => navigate('/kiem-ke/moi')}>
                    {item.ten_vtyt}
                  </span>
                ))}
                {chuaKiemKeList.length > 6 && (
                  <span className="badge info" onClick={() => navigate('/kiem-ke/moi')} style={{ cursor: 'pointer' }}>
                    +{chuaKiemKeList.length - 6} vật tư khác...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
