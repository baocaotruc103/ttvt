import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Search, Calendar, User, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

export default function KiemKeList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [filterCondition, setFilterCondition] = useState('Tất cả');
  const [searchTerm, setSearchTerm] = useState('');
  const [profilesMap, setProfilesMap] = useState({});

  const fetchAudits = async () => {
    setLoading(true);
    try {
      // Query v_kiem_ke_chi_tiet (which matches kiem_ke + danh_muc join)
      let query = supabase
        .from('v_kiem_ke_chi_tiet')
        .select('*')
        .order('ngay_kiem_ke', { ascending: false });

      if (filterCondition !== 'Tất cả') {
        query = query.eq('tinh_trang', filterCondition);
      }

      const { data, error } = await query;
      if (error) throw error;

      setAudits(data || []);

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
      console.error('Error fetching inventory audits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [filterCondition]);

  const filteredAudits = audits.filter(audit => 
    audit.ten_vtyt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (audit.ghi_chu && audit.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const groupedAudits = filteredAudits.reduce((acc, audit) => {
    if (!acc[audit.ngay_kiem_ke]) {
      acc[audit.ngay_kiem_ke] = [];
    }
    acc[audit.ngay_kiem_ke].push(audit);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedAudits).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div>
      <div className="title-container">
        <div>
          <h2>Kiểm kê Tủ trực Định kỳ</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Lịch sử kiểm kê, đối chiếu cơ số vật tư y tế tủ trực thực tế
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/kiem-ke/moi?type=manual')}>
            <Plus size={18} />
            <span>Tạo thủ công</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/kiem-ke/moi?type=auto')}>
            <Plus size={18} />
            <span>Tạo tự động</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="card filters-panel">
        <div className="search-input" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên vật tư..."
            className="form-control"
            style={{ paddingLeft: '38px', margin: 0 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <select
            className="form-control"
            style={{ margin: 0 }}
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
          >
            <option value="Tất cả">Tất cả tình trạng</option>
            <option value="Thiếu">Chỉ hàng Thiếu</option>
            <option value="Thừa">Chỉ hàng Thừa</option>
            <option value="Đủ">Chỉ hàng Đủ</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>
          <div className="spinner"></div>
          <p>Đang tải lịch sử kiểm kê...</p>
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Không có kết quả kiểm kê nào phù hợp.
        </div>
      ) : (
        <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {sortedDates.map(date => {
            const dateAudits = groupedAudits[date];
            const nguoiKiem = dateAudits.length > 0 ? (profilesMap[dateAudits[0].nguoi_kiem_ke] || 'Không rõ') : '';
            
            return (
              <div key={date} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ngày kiểm kê</div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} className="text-primary" />
                      {date.split('-').reverse().join('/')}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Người kiểm kê</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontWeight: '500' }}>
                      <User size={14} className="text-muted" />
                      {nguoiKiem}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <span className="badge secondary">{dateAudits.length} vật tư</span>
                  <button 
                    className="btn btn-outline btn-sm" 
                    onClick={() => navigate(`/kiem-ke/chi-tiet/${date}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
