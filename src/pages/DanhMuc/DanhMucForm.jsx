import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X } from 'lucide-react';

export default function DanhMucForm({ item, maxTt, onSave, onClose, onDelete }) {
  const [tt, setTt] = useState('');
  const [tenVtyt, setTenVtyt] = useState('');
  const [dvt, setDvt] = useState('Cái');
  const [coSo, setCoSo] = useState(0);
  const [coSoDiaDiem, setCoSoDiaDiem] = useState('Tủ cấp cứu A');
  const [trangThai, setTrangThai] = useState('Còn hàng');
  const [ghiChu, setGhiChu] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const dvtOptions = ['Cái', 'Hộp', 'Lọ', 'Sợi', 'Cuộn', 'Tép', 'Chai', 'Gói', 'Ống', 'Bộ'];

  useEffect(() => {
    if (item) {
      setTt(item.tt || '');
      setTenVtyt(item.ten_vtyt || '');
      setDvt(item.dvt || 'Cái');
      setCoSo(item.co_so || 0);
      setCoSoDiaDiem(item.co_so_dia_diem || 'Tủ cấp cứu A');
      setTrangThai(item.trang_thai || 'Còn hàng');
      setGhiChu(item.ghi_chu || '');
    } else {
      setTt(maxTt !== undefined ? String(maxTt + 1) : '1');
      setTenVtyt('');
      setDvt('Cái');
      setCoSo(0);
      setCoSoDiaDiem('Tủ cấp cứu A');
      setTrangThai('Còn hàng');
      setGhiChu('');
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenVtyt.trim()) {
      setErrorMsg('Vui lòng nhập tên vật tư y tế');
      return;
    }
    if (coSo < 0) {
      setErrorMsg('Cơ số định mức không được âm');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    const payload = {
      tt: tt ? Number(tt) : null,
      ten_vtyt: tenVtyt.trim(),
      dvt,
      co_so: Number(coSo),
      co_so_dia_diem: coSoDiaDiem.trim(),
      trang_thai: trangThai,
      ghi_chu: ghiChu.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      if (item?.id) {
        // Edit mode
        const { error } = await supabase
          .from('danh_muc')
          .update(payload)
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        // Add mode
        const { error } = await supabase
          .from('danh_muc')
          .insert(payload);
        
        if (error) throw error;
      }
      onSave();
    } catch (err) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra khi lưu vật tư');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div className="card" style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <h3>{item ? 'Cập nhật Vật tư Y tế' : 'Thêm mới Vật tư Y tế'}</h3>
          <button onClick={onClose} style={closeBtnStyle} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div style={formRowStyle}>
            <div className="form-group" style={{ flex: '1' }}>
              <label htmlFor="form-tt">Thứ tự hiển thị (TT)</label>
              <input
                id="form-tt"
                type="number"
                placeholder="Ví dụ: 1"
                className="form-control"
                value={tt}
                onChange={(e) => setTt(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: '2' }}>
              <label htmlFor="form-ten">Tên vật tư y tế *</label>
              <input
                id="form-ten"
                type="text"
                placeholder="Nhập tên vật tư..."
                className="form-control"
                value={tenVtyt}
                onChange={(e) => setTenVtyt(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div className="form-group" style={{ flex: '1' }}>
              <label htmlFor="form-dvt">Đơn vị tính</label>
              <select
                id="form-dvt"
                className="form-control"
                value={dvt}
                onChange={(e) => setDvt(e.target.value)}
              >
                {dvtOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1' }}>
              <label htmlFor="form-coso">Cơ số định mức *</label>
              <input
                id="form-coso"
                type="number"
                placeholder="Số lượng bắt buộc có"
                className="form-control"
                value={coSo}
                onChange={(e) => setCoSo(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={formRowStyle}>
            {/* Đã ẩn Vị trí tủ trực theo yêu cầu */}
            <div className="form-group" style={{ flex: '1' }}>
              <label htmlFor="form-trangthai">Trạng thái hoạt động</label>
              <select
                id="form-trangthai"
                className="form-control"
                value={trangThai}
                onChange={(e) => setTrangThai(e.target.value)}
              >
                <option value="Còn hàng">Còn hàng</option>
                <option value="Hết hàng">Hết hàng</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="form-ghichu">Ghi chú</label>
            <textarea
              id="form-ghichu"
              placeholder="Nhập ghi chú thêm..."
              className="form-control"
              rows="3"
              style={{ resize: 'vertical' }}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
            ></textarea>
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              {item && onDelete && (
                <button type="button" className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border, #fca5a5)' }} onClick={onDelete} disabled={loading}>
                  Xoá vật tư
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal styles
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalCardStyle = {
  width: '100%',
  maxWidth: '600px',
  boxShadow: 'var(--shadow-lg)',
  animation: 'scaleIn 0.3s ease-out'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '12px'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)'
};

const formRowStyle = {
  display: 'flex',
  gap: '16px',
  flexWrap: 'wrap'
};
