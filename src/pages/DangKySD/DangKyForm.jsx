import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { ArrowLeft, Save, Plus, Trash2, Search, X } from 'lucide-react';

export default function DangKyForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const editMaPhieu = searchParams.get('editMaPhieu') || editId; // Fallback to editId for safety if needed

  const [loading, setLoading] = useState(false);
  const [danhMuc, setDanhMuc] = useState([]);
  
  // Header state
  const [maPhieu, setMaPhieu] = useState('');
  const [ngayDangKy, setNgayDangKy] = useState(new Date().toISOString().split('T')[0]);
  const [tenBenhNhan, setTenBenhNhan] = useState('');
  
  // Items state
  const [selectedItems, setSelectedItems] = useState([]); // [{ vat_tu_id, ten_vtyt, dvt, so_luong }]
  const [errorMsg, setErrorMsg] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedIds, setCheckedIds] = useState(new Set());
  
  // Permission state
  const [nguoiDangKyId, setNguoiDangKyId] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const isManager = profile?.vai_tro === 'admin' || profile?.vai_tro === 'quan_ly_kho';
  const canEdit = !editMaPhieu || isManager || (user && nguoiDangKyId === user.id);

  useEffect(() => {
    // Generate temporary maPhieu if creating new
    if (!editMaPhieu && profile) {
      const generateMaPhieu = () => {
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const username = profile.username || 'user';
        return `${d}${m}${y}-${hh}${mm}-${username}`;
      };
      setMaPhieu(generateMaPhieu());
    }

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('danh_muc')
          .select('id, ten_vtyt, dvt')
          .eq('trang_thai', 'Còn hàng')
          .order('tt', { ascending: true });
        
        if (error) throw error;
        setDanhMuc(data || []);

        if (editMaPhieu) {
          const { data: editData, error: editError } = await supabase
            .from('dang_ky_sd')
            .select('*')
            .eq('ma_phieu', editMaPhieu);
          
          if (editError) throw editError;
          if (editData && editData.length > 0) {
            setMaPhieu(editData[0].ma_phieu);
            setNgayDangKy(editData[0].ngay_dang_ky);
            setTenBenhNhan(editData[0].ghi_chu || '');
            setNguoiDangKyId(editData[0].nguoi_dang_ky);
            
            const { data: profileData } = await supabase
              .from('profiles')
              .select('ho_ten, username')
              .eq('id', editData[0].nguoi_dang_ky)
              .single();
              
            if (profileData) {
              setCreatorName(profileData.ho_ten || profileData.username || 'User');
            } else {
              setCreatorName('User');
            }
            
            const loadedItems = editData.map(row => {
              const dm = (data || []).find(d => d.id === row.vat_tu_id);
              return {
                id: row.id, // Keep the ID for updating existing rows
                vat_tu_id: row.vat_tu_id,
                ten_vtyt: dm ? dm.ten_vtyt : 'Không xác định',
                dvt: dm ? dm.dvt : '',
                so_luong: row.so_luong
              };
            });
            setSelectedItems(loadedItems);
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
      }
    };

    fetchData();
  }, [editMaPhieu, profile]);

  const handleOpenModal = () => {
    setCheckedIds(new Set(selectedItems.map(item => item.vat_tu_id)));
    setSearchTerm('');
    setShowModal(true);
  };

  const handleToggleCheck = (id) => {
    const newChecked = new Set(checkedIds);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedIds(newChecked);
  };

  const handleConfirmSelection = () => {
    // Add new items
    const newSelectedItems = [...selectedItems];
    
    // Remove items that were unchecked
    const filteredItems = newSelectedItems.filter(item => checkedIds.has(item.vat_tu_id));
    
    // Add newly checked items
    checkedIds.forEach(id => {
      if (!filteredItems.find(item => item.vat_tu_id === id)) {
        const dm = danhMuc.find(d => d.id === id);
        if (dm) {
          filteredItems.push({
            vat_tu_id: id,
            ten_vtyt: dm.ten_vtyt,
            dvt: dm.dvt,
            so_luong: ''
          });
        }
      }
    });

    setSelectedItems(filteredItems);
    setShowModal(false);
  };

  const handleUpdateSoLuong = (vat_tu_id, value) => {
    setSelectedItems(prev => prev.map(item => 
      item.vat_tu_id === vat_tu_id ? { ...item, so_luong: value } : item
    ));
  };

  const handleRemoveItem = (vat_tu_id) => {
    setSelectedItems(prev => prev.filter(item => item.vat_tu_id !== vat_tu_id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một vật tư');
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      if (!item.so_luong || Number(item.so_luong) <= 0) {
        setErrorMsg(`Số lượng cho ${item.ten_vtyt} phải lớn hơn 0`);
        return;
      }
    }

    setErrorMsg('');
    setLoading(true);

    try {
      if (editMaPhieu) {
        // Xoá các vật tư cũ của mã phiếu này
        await supabase.from('dang_ky_sd').delete().eq('ma_phieu', editMaPhieu);
      }

      // Prepare new items payload
      const payloads = selectedItems.map(item => ({
        ma_phieu: maPhieu,
        ngay_dang_ky: ngayDangKy,
        vat_tu_id: item.vat_tu_id,
        so_luong: Number(item.so_luong),
        da_linh: false,
        nguoi_dang_ky: user?.id || null,
        ghi_chu: tenBenhNhan.trim()
      }));

      const { error } = await supabase
        .from('dang_ky_sd')
        .insert(payloads);

      if (error) throw error;
      navigate('/dang-ky-su-dung');
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi xảy ra khi lưu phiếu đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const filteredModalList = danhMuc.filter(item => 
    item.ten_vtyt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-secondary btn-icon-only" onClick={() => navigate('/dang-ky-su-dung')} title="Quay lại">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2>{editMaPhieu ? 'Sửa Phiếu Đăng ký' : 'Tạo Phiếu Đăng ký Sử dụng'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Quản lý danh sách vật tư cần lĩnh bù theo từng phiếu</p>
        </div>
      </div>

      <div className="card">
        {errorMsg && <div className="login-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Mã phiếu</label>
              <input type="text" className="form-control" value={maPhieu} readOnly style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ngày đăng ký</label>
              <input type="date" className="form-control" value={ngayDangKy} onChange={(e) => setNgayDangKy(e.target.value)} required readOnly={!canEdit} style={{ backgroundColor: !canEdit ? '#e2e8f0' : 'white' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Người đăng ký</label>
              <input type="text" className="form-control" value={editMaPhieu ? (creatorName || 'Đang tải...') : (profile?.ho_ten || profile?.username || 'User')} readOnly style={{ backgroundColor: '#e2e8f0' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tên bệnh nhân / Mục đích *</label>
              <input type="text" className="form-control" value={tenBenhNhan} onChange={(e) => setTenBenhNhan(e.target.value)} placeholder="Nhập tên bệnh nhân..." required readOnly={!canEdit} style={{ backgroundColor: !canEdit ? '#e2e8f0' : 'white' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Danh sách Vật tư</h3>
            {canEdit && (
              <button type="button" className="btn btn-outline" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} />
                <span>Chọn vật tư</span>
              </button>
            )}
          </div>

          {selectedItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
              Chưa có vật tư nào được chọn. Hãy bấm "Chọn vật tư" để thêm vào danh sách.
            </div>
          ) : (
            <div className="table-wrapper" style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#059669', color: 'white' }}>
                    <th style={{ width: '40px', textAlign: 'center', padding: '12px 4px', borderRight: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>TT</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Tên vật tư</th>
                    <th style={{ width: '70px', textAlign: 'center', padding: '12px 4px', borderRight: '1px solid rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>Số lượng</th>
                    {canEdit && <th style={{ width: '40px', textAlign: 'center', padding: '12px 4px', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item, index) => (
                    <tr key={item.vat_tu_id} style={{ borderBottom: '1px solid #d1d5db', backgroundColor: 'white' }}>
                      <td style={{ textAlign: 'center', padding: '12px 8px', borderRight: '1px solid #d1d5db', fontWeight: '600', color: '#111827' }}>{index + 1}</td>
                      <td style={{ padding: '12px 12px', borderRight: '1px solid #d1d5db' }}>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>{item.ten_vtyt}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>ĐVT: {item.dvt}</div>
                      </td>
                      <td style={{ padding: '0', borderRight: '1px solid #d1d5db', textAlign: 'center', verticalAlign: 'middle' }}>
                        <input 
                          type="number" 
                          value={item.so_luong} 
                          onChange={(e) => handleUpdateSoLuong(item.vat_tu_id, e.target.value)}
                          style={{ width: '100%', height: '100%', minHeight: '44px', padding: '12px 8px', border: 'none', textAlign: 'center', color: '#0d9488', fontWeight: 'bold', fontSize: '1.1rem', outline: 'none', backgroundColor: 'transparent' }}
                          placeholder="0"
                          min="0.01"
                          step="any"
                          required
                          readOnly={!canEdit}
                        />
                      </td>
                      {canEdit && (
                        <td style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button type="button" onClick={() => handleRemoveItem(item.vat_tu_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '32px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/dang-ky-su-dung')}
              disabled={loading}
            >
              {canEdit ? 'Huỷ' : 'Quay lại'}
            </button>
            {canEdit && (
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                <span>{loading ? 'Đang lưu...' : 'Lưu phiếu đăng ký'}</span>
              </button>
            )}
          </div>
          
          {canEdit && (
            <button 
              type="submit" 
              className="fab-save" 
              disabled={loading}
              title="Lưu"
            >
              <Save size={24} />
            </button>
          )}
        </form>
      </div>

      {/* Modal Chọn Vật Tư */}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ padding: '12px 16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                Chọn VTYT 
                {checkedIds.size > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>({checkedIds.size})</span>}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 12px' }} onClick={() => setShowModal(false)}>Huỷ</button>
                <button type="button" className="btn btn-primary btn-sm" style={{ padding: '4px 12px' }} onClick={handleConfirmSelection}>Xác nhận</button>
              </div>
            </div>
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Tìm kiếm tên vật tư..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredModalList.map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', gap: '12px' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '18px', height: '18px' }}
                      checked={checkedIds.has(item.id)}
                      onChange={() => handleToggleCheck(item.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{item.ten_vtyt}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ĐVT: {item.dvt}</div>
                    </div>
                  </label>
                ))}
                {filteredModalList.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không tìm thấy vật tư nào
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      )}

    </div>
  );
}
