import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { ArrowLeft, Save, HelpCircle, AlertCircle } from 'lucide-react';

export default function KiemKeForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'auto';
  const editDate = queryParams.get('editDate');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [ngayKiemKe, setNgayKiemKe] = useState(editDate || new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [editType, setEditType] = useState('Thủ công'); // Lưu loại kiểm kê khi đang sửa

  useEffect(() => {
    const loadAuditTemplate = async () => {
      setLoading(true);
      try {
        // 1. Fetch active medical supplies
        const { data: dmData, error: dmError } = await supabase
          .from('danh_muc')
          .select('id, ten_vtyt, dvt, co_so')
          .order('tt', { ascending: true });

        if (dmError) throw dmError;

        // 2. Fetch unfulfilled registrations
        const { data: dkData, error: dkError } = await supabase
          .from('dang_ky_sd')
          .select('vat_tu_id, so_luong')
          .eq('da_linh', false);

        if (dkError) throw dkError;

        if (editDate) {
          // Fetch existing audit records for this date
          const { data: existingData, error: extError } = await supabase
            .from('kiem_ke')
            .select('*')
            .eq('ngay_kiem_ke', editDate);
            
          if (extError) throw extError;
          
          const existingMap = {};
          if (existingData && existingData.length > 0) {
            existingData.forEach(row => {
               existingMap[row.vat_tu_id] = row;
               if (row.loai_kiem_ke) setEditType(row.loai_kiem_ke);
            });
          }
          
          const template = (dmData || []).map((item, idx) => {
            const extRow = existingMap[item.id];
            return {
              tt: idx + 1,
              vat_tu_id: item.id,
              ten_vtyt: item.ten_vtyt,
              dvt: item.dvt,
              co_so: Number(item.co_so),
              sl_kiem_ke_thuc_te: extRow ? Number(extRow.sl_kiem_ke_thuc_te) : Number(item.co_so),
              sl_da_su_dung_chua_linh: extRow ? Number(extRow.sl_da_su_dung_chua_linh) : 0,
              ghi_chu: extRow?.ghi_chu || ''
            };
          });
          setItems(template);
          return;
        }

        // Calculate sum of unfulfilled quantities per supply item
        const pendingSums = {};
        if (dkData) {
          dkData.forEach(reg => {
            pendingSums[reg.vat_tu_id] = (pendingSums[reg.vat_tu_id] || 0) + Number(reg.so_luong);
          });
        }

        // Map into template state
        const template = (dmData || []).map((item, idx) => {
          const pendingQty = pendingSums[item.id] || 0;
          const defaultPhysical = Math.max(0, Number(item.co_so) - pendingQty);
          
          return {
            tt: idx + 1,
            vat_tu_id: item.id,
            ten_vtyt: item.ten_vtyt,
            dvt: item.dvt,
            co_so: Number(item.co_so),
            sl_kiem_ke_thuc_te: type === 'auto' ? defaultPhysical : Number(item.co_so),
            sl_da_su_dung_chua_linh: type === 'auto' ? pendingQty : 0,
            ghi_chu: ''
          };
        });

        setItems(template);
      } catch (err) {
        console.error('Error preparing audit template:', err);
        setErrorMsg('Không thể khởi tạo biểu mẫu kiểm kê: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAuditTemplate();
  }, []);

  const handlePhysicalQtyChange = (index, val) => {
    const updated = [...items];
    updated[index].sl_kiem_ke_thuc_te = val === '' ? '' : Number(val);
    setItems(updated);
  };

  const handlePendingQtyChange = (index, val) => {
    const updated = [...items];
    const numVal = val === '' ? '' : Number(val);
    updated[index].sl_da_su_dung_chua_linh = numVal;
    
    // Tự động trừ số thực tế nếu là thủ công
    if (type === 'manual' && numVal !== '') {
      updated[index].sl_kiem_ke_thuc_te = Math.max(0, updated[index].co_so - numVal);
    } else if (type === 'manual' && numVal === '') {
      updated[index].sl_kiem_ke_thuc_te = updated[index].co_so;
    }
    
    setItems(updated);
  };

  const handleRowNoteChange = (index, val) => {
    const updated = [...items];
    updated[index].ghi_chu = val;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Validate that all values are numbers
    const invalidRow = items.find(item => item.sl_kiem_ke_thuc_te === '' || item.sl_kiem_ke_thuc_te < 0);
    if (invalidRow) {
      setErrorMsg(`Vui lòng nhập số lượng kiểm kê hợp lệ cho "${invalidRow.ten_vtyt}"`);
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (editDate) {
        // Delete old records before inserting updated ones
        const { error: delError } = await supabase
          .from('kiem_ke')
          .delete()
          .eq('ngay_kiem_ke', editDate);
        if (delError) throw delError;
      }

      const records = items.map(item => ({
        ngay_kiem_ke: ngayKiemKe,
        vat_tu_id: item.vat_tu_id,
        sl_kiem_ke_thuc_te: Number(item.sl_kiem_ke_thuc_te),
        sl_da_su_dung_chua_linh: Number(item.sl_da_su_dung_chua_linh),
        nguoi_kiem_ke: user?.id || null,
        ghi_chu: item.ghi_chu.trim() || null,
        loai_kiem_ke: editDate ? editType : (type === 'auto' ? 'Tự động' : 'Thủ công')
      }));

      const { error } = await supabase
        .from('kiem_ke')
        .insert(records);

      if (error) throw error;
      navigate('/kiem-ke');
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi xảy ra khi lưu phiếu kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Đang chuẩn bị danh mục kiểm kê tủ trực...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-icon-only" onClick={() => navigate('/kiem-ke')} title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div style={{ flexGrow: 1 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Phiếu Kiểm kê Tủ trực 
            <span className={`badge ${editDate ? (editType === 'Tự động' ? 'primary' : 'secondary') : (type === 'auto' ? 'primary' : 'secondary')}`}>
              {editDate ? editType : (type === 'auto' ? 'Tự động' : 'Thủ công')}
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {editDate ? 'Chỉnh sửa phiếu kiểm kê đã lưu' : 'Đối chiếu số lượng thực tế với định mức cơ số'}
          </p>
        </div>
        <div>
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="audit-date" style={{ whiteSpace: 'nowrap' }}>Ngày kiểm kê:</label>
            <input
              id="audit-date"
              type="date"
              className="form-control"
              style={{ width: '150px', margin: 0 }}
              value={ngayKiemKe}
              onChange={(e) => setNgayKiemKe(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

      <div className="card" style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--info-glow)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>
          <AlertCircle size={16} style={{ color: 'var(--info)' }} />
          <span>
            <strong>Hướng dẫn:</strong> Nhập <strong>SL thực tế</strong> đếm được trong tủ. 
            Tổng số lượng = SL thực tế + SL đã đăng ký chưa lĩnh bù. Chênh lệch = Tổng số lượng - Cơ số định mức.
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="table-wrapper" style={{ marginBottom: '24px' }}>
          <table className="responsive-table table-mobile-3col">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>TT</th>
                <th>Tên vật tư</th>
                <th style={{ textAlign: 'center' }}>Cơ số</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Đang dùng</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Thực tế</th>
                <th style={{ textAlign: 'center' }}>Tổng KK</th>
                <th style={{ textAlign: 'center' }}>Thừa/thiếu</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const physical = item.sl_kiem_ke_thuc_te === '' ? 0 : Number(item.sl_kiem_ke_thuc_te);
                const pending = item.sl_da_su_dung_chua_linh === '' ? 0 : Number(item.sl_da_su_dung_chua_linh);
                const total = physical + pending;
                const diff = total - item.co_so;
                
                let statusClass = 'success';
                let diffText = 'Đủ';
                if (item.sl_kiem_ke_thuc_te === '' && item.sl_da_su_dung_chua_linh === '') {
                  statusClass = '';
                  diffText = '-';
                } else if (diff < 0) {
                  statusClass = 'danger';
                  diffText = `Thiếu ${Math.abs(diff)}`;
                } else if (diff > 0) {
                  statusClass = 'warning';
                  diffText = `Thừa ${diff}`;
                }

                return (
                  <tr key={item.vat_tu_id} className={statusClass ? `row-${statusClass}` : ''}>
                    <td data-label="TT" style={{ textAlign: 'center', fontWeight: '600' }}>{item.tt}</td>
                    <td data-label="Tên vật tư">
                      <span style={{ fontWeight: '600' }}>{item.ten_vtyt}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({item.dvt})</span>
                    </td>
                    <td data-label="Cơ số" style={{ textAlign: 'center', fontWeight: '500' }}>{item.co_so}</td>
                    
                    <td data-label="Đang dùng" style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        className="form-control"
                        style={{ textAlign: 'center', margin: '0 auto', width: '80px', padding: '6px' }}
                        value={item.sl_da_su_dung_chua_linh}
                        onChange={(e) => handlePendingQtyChange(index, e.target.value)}
                        min="0"
                        disabled={type === 'auto'}
                      />
                    </td>
                    
                    <td data-label="Thực tế" style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        className="form-control"
                        style={{ textAlign: 'center', margin: '0 auto', width: '80px', padding: '6px' }}
                        value={item.sl_kiem_ke_thuc_te}
                        onChange={(e) => handlePhysicalQtyChange(index, e.target.value)}
                        min="0"
                        required
                        disabled={type === 'auto'}
                      />
                    </td>
                    
                    <td data-label="Tổng KK" style={{ textAlign: 'center', fontWeight: '600' }}>
                      {item.sl_kiem_ke_thuc_te !== '' || item.sl_da_su_dung_chua_linh !== '' ? total : '-'}
                    </td>
                    
                    <td data-label="Thừa/thiếu" style={{ textAlign: 'center' }}>
                      <span className={`badge ${statusClass}`} style={{ minWidth: '70px', justifyContent: 'center' }}>
                        {diffText}
                      </span>
                    </td>
                    
                    <td data-label="Ghi chú">
                      <input
                        type="text"
                        placeholder="Ghi chú..."
                        className="form-control"
                        style={{ padding: '6px', fontSize: '0.8rem', minWidth: '150px', margin: 0 }}
                        value={item.ghi_chu}
                        onChange={(e) => handleRowNoteChange(index, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/kiem-ke')}
            disabled={saving}
          >
            Huỷ bỏ
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} />
            <span>{saving ? 'Đang lưu kết quả...' : 'Lưu phiếu kiểm kê'}</span>
          </button>
        </div>
        
        <button 
          type="submit" 
          className="fab-save" 
          disabled={saving || items.length === 0}
          title="Lưu"
        >
          <Save size={24} />
        </button>
      </form>
    </div>
  );
}
