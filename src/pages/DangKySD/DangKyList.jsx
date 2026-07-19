import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Check, Search, Calendar, User } from 'lucide-react';

export default function DangKyList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Set initial filter from query parameter if available
  const initialFilter = searchParams.get('filter') === 'chua_linh' ? 'Chưa lĩnh' : 'Tất cả';
  
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState([]);
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [profilesMap, setProfilesMap] = useState({});

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('dang_ky_sd')
        .select('*')
        .order('ngay_dang_ky', { ascending: false });

      if (filterStatus === 'Chưa lĩnh') {
        query = query.eq('da_linh', false);
      } else if (filterStatus === 'Đã lĩnh') {
        query = query.eq('da_linh', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setRegistrations(data || []);

      // Fetch profiles to map user IDs to names
      const { data: profData } = await supabase.from('profiles').select('id, ho_ten');
      const pMap = {};
      if (profData) {
        profData.forEach(p => {
          pMap[p.id] = p.ho_ten;
        });
      }
      setProfilesMap(pMap);

    } catch (err) {
      console.error('Error fetching registrations list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [filterStatus]);

  // Sync URL search params if filter status changes
  const handleFilterChange = (status) => {
    setFilterStatus(status);
    if (status === 'Chưa lĩnh') {
      setSearchParams({ filter: 'chua_linh' });
    } else {
      setSearchParams({});
    }
  };

  const handleMarkAsLinh = async (id) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('dang_ky_sd')
        .update({ da_linh: true, ngay_linh: todayStr })
        .eq('id', id);

      if (error) throw error;
      fetchRegistrations();
    } catch (err) {
      alert('Lỗi cập nhật lĩnh vật tư: ' + err.message);
    }
  };

  // Filter registrations by item name
  const filteredRegs = registrations.filter(reg => {
    const supplyName = reg.danh_muc?.ten_vtyt || '';
    return supplyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (reg.ghi_chu && reg.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div>
      <div className="title-container">
        <div>
          <h2>Đăng ký Sử dụng Vật tư</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý và lĩnh bù các vật tư y tế đã sử dụng tại tủ trực
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/dang-ky-su-dung/moi')}>
          <Plus size={18} />
          <span>Đăng ký sử dụng</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="card filters-panel">
        <div className="search-input" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên vật tư hoặc ghi chú..."
            className="form-control"
            style={{ paddingLeft: '38px', margin: 0 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${filterStatus === 'Tất cả' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleFilterChange('Tất cả')}
          >
            Tất cả
          </button>
          <button 
            className={`btn ${filterStatus === 'Chưa lĩnh' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleFilterChange('Chưa lĩnh')}
          >
            Chưa lĩnh
          </button>
          <button 
            className={`btn ${filterStatus === 'Đã lĩnh' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => handleFilterChange('Đã lĩnh')}
          >
            Đã lĩnh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>
          <div className="spinner"></div>
          <p>Đang tải danh sách đăng ký...</p>
        </div>
      ) : filteredRegs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Không có đăng ký sử dụng nào phù hợp.
        </div>
      ) : (
        <div className="card" style={{ padding: '8px' }}>
          <div className="table-wrapper">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Ngày đăng ký</th>
                  <th>Tên vật tư</th>
                  <th>Số lượng</th>
                  <th>Người đăng ký</th>
                  <th>Trạng thái</th>
                  <th>Ngày lĩnh</th>
                  <th>Ghi chú</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegs.map((reg) => (
                  <tr key={reg.id}>
                    <td data-label="Ngày đăng ký" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} className="text-muted" />
                        {reg.ngay_dang_ky ? reg.ngay_dang_ky.split('-').reverse().join('/') : ''}
                      </span>
                    </td>
                    <td data-label="Tên vật tư" style={{ fontWeight: '500' }}>
                      {reg.danh_muc?.ten_vtyt}
                    </td>
                    <td data-label="Số lượng" style={{ fontWeight: '600' }}>
                      {reg.so_luong} {reg.danh_muc?.dvt}
                    </td>
                    <td data-label="Người đăng ký">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <User size={14} className="text-muted" />
                        {profilesMap[reg.nguoi_dang_ky] || 'Không rõ'}
                      </span>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${reg.da_linh ? 'success' : 'warning'}`}>
                        {reg.da_linh ? 'Đã lĩnh bù' : 'Chưa lĩnh bù'}
                      </span>
                    </td>
                    <td data-label="Ngày lĩnh">
                      {reg.ngay_linh ? reg.ngay_linh.split('-').reverse().join('/') : '-'}
                    </td>
                    <td data-label="Ghi chú" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {reg.ghi_chu || '-'}
                    </td>
                    <td data-label="Hành động">
                      {!reg.da_linh ? (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 8px', gap: '4px' }}
                          onClick={() => handleMarkAsLinh(reg.id)}
                        >
                          <Check size={14} />
                          <span>Lĩnh bù</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '500' }}>Hoàn thành</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
