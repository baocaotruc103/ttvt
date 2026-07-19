import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, Trash2, Edit, X } from 'lucide-react';

export default function KiemKeChiTiet() {
  const { date } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_kiem_ke_chi_tiet')
          .select('*')
          .eq('ngay_kiem_ke', date)
          .order('vat_tu_id', { ascending: true });

        if (error) throw error;
        setAudits(data || []);

        const { data: profData } = await supabase.from('profiles').select('id, ho_ten');
        if (profData) {
          const pMap = {};
          profData.forEach(p => { pMap[p.id] = p.ho_ten; });
          setProfilesMap(pMap);
        }
      } catch (err) {
        setErrorMsg('Không thể tải dữ liệu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (date) {
      fetchDetails();
    }
  }, [date]);

  const handleDeleteDate = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ phiếu kiểm kê ngày ${date.split('-').reverse().join('/')} không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    
    setLoading(true);
    const { error } = await supabase
      .from('kiem_ke')
      .delete()
      .eq('ngay_kiem_ke', date);
      
    if (error) {
      alert('Có lỗi xảy ra khi xóa: ' + error.message);
      setLoading(false);
      return;
    }
    
    navigate('/kiem-ke');
  };

  const handleEditDate = () => {
    navigate(`/kiem-ke/moi?editDate=${date}`);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang tải chi tiết kiểm kê...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>
        <p>{errorMsg}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/kiem-ke')}>Quay lại</button>
      </div>
    );
  }

  const nguoiKiem = audits.length > 0 ? (profilesMap[audits[0].nguoi_kiem_ke] || 'Không rõ') : '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-icon-only" onClick={() => navigate('/kiem-ke')} title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flexGrow: 1 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Chi tiết kiểm kê ngày {date ? date.split('-').reverse().join('/') : ''}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Người kiểm kê: {nguoiKiem}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDeleteDate}>
            <Trash2 size={16} />
            <span className="hide-mobile">Xóa phiếu</span>
          </button>
          <button className="btn btn-primary" onClick={handleEditDate}>
            <Edit size={16} />
            <span className="hide-mobile">Sửa phiếu</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '8px' }}>
        <div className="table-wrapper">
          <table className="responsive-table table-mobile-3col">
            <thead>
              <tr>
                <th>Tên vật tư</th>
                <th className="hide-mobile">Đơn vị tính</th>
                <th>Cơ số</th>
                <th>SL thực tế</th>
                <th>Chờ lĩnh bù</th>
                <th>Tổng số</th>
                <th>Chênh lệch</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                let statusClass = 'success';
                let diffText = 'Đủ';
                const diff = audit.thua_thieu;
                
                if (diff < 0) {
                  statusClass = 'danger';
                  diffText = `Thiếu ${Math.abs(diff)}`;
                } else if (diff > 0) {
                  statusClass = 'warning';
                  diffText = `Thừa ${diff}`;
                }

                return (
                  <tr key={audit.id}>
                    <td data-label="Tên vật tư" style={{ fontWeight: '500' }}>
                      {audit.ten_vtyt}
                    </td>
                    <td data-label="Đơn vị tính" className="hide-mobile">{audit.dvt}</td>
                    <td data-label="Cơ số">{audit.co_so}</td>
                    <td data-label="SL thực tế" style={{ fontWeight: '600' }}>{audit.sl_kiem_ke_thuc_te}</td>
                    <td data-label="Chờ lĩnh bù" style={{ color: 'var(--text-muted)' }}>{audit.sl_da_su_dung_chua_linh}</td>
                    <td data-label="Tổng số" style={{ fontWeight: '600' }}>{audit.tong_so_luong}</td>
                    <td data-label="Chênh lệch">
                      <span className={`badge ${statusClass}`} style={{ minWidth: '70px', justifyContent: 'center' }}>
                        {diffText}
                      </span>
                    </td>
                    <td data-label="Ghi chú" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {audit.ghi_chu || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => navigate('/kiem-ke')}
        >
          Đóng
        </button>
      </div>
      
      <button 
        className="fab-close" 
        onClick={() => navigate('/kiem-ke')}
        title="Đóng"
      >
        <X size={24} />
      </button>
    </div>
  );
}
