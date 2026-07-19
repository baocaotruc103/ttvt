import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Check, Search, Calendar, User, Edit, Trash2, List, FileText } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function DangKyList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialFilter = searchParams.get('filter') === 'chua_linh' ? 'Chưa lĩnh' : 'Tất cả';
  
  const isManager = profile?.vai_tro === 'admin' || profile?.vai_tro === 'quan_ly_kho';
  
  const [loading, setLoading] = useState(true);
  const [groupedRegistrations, setGroupedRegistrations] = useState([]);
  const [filterStatus, setFilterStatus] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState('');
  const [profilesMap, setProfilesMap] = useState({});

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      // Query joining with danh_muc to get ten_vtyt
      const { data, error } = await supabase
        .from('dang_ky_sd')
        .select(`
          *,
          danh_muc ( id, ten_vtyt, dvt )
        `)
        .order('ngay_dang_ky', { ascending: false });

      if (error) throw error;

      // Grouping logic
      const grouped = {};
      (data || []).forEach(reg => {
        const maPhieu = reg.ma_phieu || reg.id;
        if (!grouped[maPhieu]) {
          grouped[maPhieu] = {
            ma_phieu: maPhieu,
            ngay_dang_ky: reg.ngay_dang_ky,
            ngay_linh: reg.ngay_linh,
            ghi_chu: reg.ghi_chu,
            nguoi_dang_ky: reg.nguoi_dang_ky,
            da_linh: reg.da_linh,
            items: []
          };
        }
        grouped[maPhieu].items.push({
          id: reg.id,
          ten_vtyt: reg.danh_muc?.ten_vtyt,
          so_luong: reg.so_luong,
          dvt: reg.danh_muc?.dvt
        });
      });

      let groupedArray = Object.values(grouped);

      // Apply Filter by Status
      if (filterStatus === 'Chưa lĩnh') {
        groupedArray = groupedArray.filter(g => !g.da_linh);
      } else if (filterStatus === 'Đã lĩnh') {
        groupedArray = groupedArray.filter(g => g.da_linh);
      }

      // Sort by date descending
      groupedArray.sort((a, b) => new Date(b.ngay_dang_ky) - new Date(a.ngay_dang_ky));

      setGroupedRegistrations(groupedArray);

      // Fetch profiles to map user IDs to names
      const { data: profData } = await supabase.from('profiles').select('id, ho_ten, username');
      const pMap = {};
      if (profData) {
        profData.forEach(p => {
          pMap[p.id] = p.ho_ten || p.username;
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

  const handleMarkAsLinh = async (maPhieu) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('dang_ky_sd')
        .update({ da_linh: true, ngay_linh: todayStr })
        .eq('ma_phieu', maPhieu);

      if (error) throw error;
      fetchRegistrations();
    } catch (err) {
      console.error('Lỗi khi cập nhật:', err);
      alert('Đã xảy ra lỗi khi lĩnh bù');
    }
  };

  const handleDeleteReg = async (maPhieu) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu đăng ký này? Tất cả vật tư trong phiếu sẽ bị xóa.')) return;
    try {
      const { error } = await supabase
        .from('dang_ky_sd')
        .delete()
        .eq('ma_phieu', maPhieu);
      if (error) throw error;
      fetchRegistrations();
    } catch (err) {
      alert('Lỗi khi xóa đăng ký: ' + err.message);
    }
  };

  // Filter registrations by search term
  const filteredRegs = groupedRegistrations.filter(reg => {
    const searchStr = searchTerm.toLowerCase();
    const matchGhiChu = reg.ghi_chu && reg.ghi_chu.toLowerCase().includes(searchStr);
    const matchMaPhieu = reg.ma_phieu.toLowerCase().includes(searchStr);
    const matchItems = reg.items.some(item => item.ten_vtyt && item.ten_vtyt.toLowerCase().includes(searchStr));
    return matchGhiChu || matchMaPhieu || matchItems;
  });

  return (
    <div>
      <div className="title-container">
        <div>
          <h2>Đăng ký Sử dụng Vật tư</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý và lĩnh bù các phiếu vật tư y tế đã sử dụng tại tủ trực
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/dang-ky-su-dung/moi')}>
          <Plus size={18} />
          <span>Tạo phiếu mới</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="card filters-panel">
        <div className="search-input" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, bệnh nhân, vật tư..."
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
          <p>Đang tải danh sách phiếu...</p>
        </div>
      ) : filteredRegs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Không có phiếu đăng ký nào phù hợp.
        </div>
      ) : (
        <div className="card" style={{ padding: '8px' }}>
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '100%', width: '100%' }}>
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Trạng thái</th>
                  {isManager && <th>Hành động</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRegs.map((reg) => (
                  <tr 
                    key={reg.ma_phieu}
                    onClick={() => navigate(`/dang-ky-su-dung/moi?editMaPhieu=${reg.ma_phieu}`)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td data-label="Mã phiếu" style={{ fontWeight: '600', color: 'var(--primary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} />
                        {reg.ma_phieu}
                      </span>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`badge ${reg.da_linh ? 'success' : 'warning'}`}>
                        {reg.da_linh ? 'Đã lĩnh bù' : 'Chưa lĩnh bù'}
                      </span>
                      {reg.da_linh && reg.ngay_linh && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Ngày lĩnh: {reg.ngay_linh.split('-').reverse().join('/')}
                        </div>
                      )}
                    </td>
                    {isManager && (
                      <td data-label="Hành động">
                        {!reg.da_linh ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', gap: '4px' }}
                              onClick={(e) => { e.stopPropagation(); handleMarkAsLinh(reg.ma_phieu); }}
                              title="Đánh dấu đã lĩnh bù toàn bộ phiếu"
                            >
                              <Check size={14} />
                              <span className="hide-mobile">Lĩnh bù</span>
                            </button>
                            
                            <button 
                              className="btn btn-secondary btn-sm btn-icon-only"
                              onClick={(e) => { e.stopPropagation(); navigate(`/dang-ky-su-dung/moi?editMaPhieu=${reg.ma_phieu}`); }}
                              title="Sửa phiếu"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn btn-outline btn-sm btn-icon-only"
                              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                              onClick={(e) => { e.stopPropagation(); handleDeleteReg(reg.ma_phieu); }}
                              title="Xóa toàn bộ phiếu"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: '500' }}>Hoàn thành</span>
                        )}
                      </td>
                    )}
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
