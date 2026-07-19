import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';

export default function DangKyForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [danhMuc, setDanhMuc] = useState([]);
  const [vatTuId, setVatTuId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [soLuong, setSoLuong] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchActiveDanhMuc = async () => {
      try {
        const { data, error } = await supabase
          .from('danh_muc')
          .select('id, ten_vtyt, dvt')
          .eq('trang_thai', 'Đang dùng')
          .order('tt', { ascending: true });
        
        if (error) throw error;
        setDanhMuc(data || []);
      } catch (err) {
        console.error('Error fetching supplies for registration:', err);
      }
    };

    fetchActiveDanhMuc();
  }, []);

  const handleVatTuChange = (e) => {
    const id = e.target.value;
    setVatTuId(id);
    const item = danhMuc.find(item => item.id === id);
    setSelectedUnit(item ? item.dvt : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vatTuId) {
      setErrorMsg('Vui lòng chọn vật tư y tế');
      return;
    }
    if (!soLuong || Number(soLuong) <= 0) {
      setErrorMsg('Số lượng đăng ký phải lớn hơn 0');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const payload = {
        ngay_dang_ky: todayStr,
        vat_tu_id: vatTuId,
        so_luong: Number(soLuong),
        da_linh: false,
        nguoi_dang_ky: user?.id || null,
        ghi_chu: ghiChu.trim()
      };

      const { error } = await supabase
        .from('dang_ky_sd')
        .insert(payload);

      if (error) throw error;
      navigate('/dang-ky-su-dung');
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi xảy ra khi đăng ký sử dụng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-secondary btn-icon-only" onClick={() => navigate('/dang-ky-su-dung')} title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2>Đăng ký Sử dụng Vật tư</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đăng ký lượng vật tư đã sử dụng chờ lĩnh bù</p>
        </div>
      </div>

      <div className="card">
        {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="select-vattu">Chọn vật tư y tế *</label>
            <select
              id="select-vattu"
              className="form-control"
              value={vatTuId}
              onChange={handleVatTuChange}
              required
            >
              <option value="">-- Chọn vật tư cần lĩnh --</option>
              {danhMuc.map(item => (
                <option key={item.id} value={item.id}>{item.ten_vtyt}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="reg-qty">Số lượng đăng ký *</label>
              <input
                id="reg-qty"
                type="number"
                inputMode="decimal"
                placeholder="Nhập số lượng..."
                className="form-control"
                value={soLuong}
                onChange={(e) => setSoLuong(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group" style={{ flex: '1', minWidth: '120px' }}>
              <label htmlFor="reg-unit">Đơn vị tính</label>
              <input
                id="reg-unit"
                type="text"
                className="form-control"
                value={selectedUnit}
                readOnly
                placeholder="Đơn vị tính..."
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-note">Ghi chú / Tên bệnh nhân / Mục đích</label>
            <textarea
              id="reg-note"
              placeholder="Ví dụ: Lĩnh bù ca trực 18/07, dùng cho bệnh nhân Nguyễn Văn A..."
              className="form-control"
              rows="3"
              style={{ resize: 'vertical' }}
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
            ></textarea>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/dang-ky-su-dung')}
              disabled={loading}
            >
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Đang lưu...' : 'Lưu đăng ký'}</span>
            </button>
          </div>
          
          <button 
            type="submit" 
            className="fab-save" 
            disabled={loading}
            title="Lưu"
          >
            <Save size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}
