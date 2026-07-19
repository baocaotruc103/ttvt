import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Check, Search, Calendar, User, Edit, Trash2, List, FileText, Download, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import * as XLSX from 'xlsx';

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
  
  // Modal Nhập bù
  const [showNhapBuModal, setShowNhapBuModal] = useState(false);
  const [nhapBuReg, setNhapBuReg] = useState(null);
  const [nhapBuItems, setNhapBuItems] = useState([]);

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

  const handleOpenNhapBu = (reg) => {
    setNhapBuReg(reg);
    setNhapBuItems(reg.items.map(item => ({
      ...item,
      so_luong_nhap_bu: item.so_luong
    })));
    setShowNhapBuModal(true);
  };
  
  const handleNhapBuChange = (id, value) => {
    const numValue = value === '' ? '' : Number(value);
    setNhapBuItems(prev => prev.map(item => 
      item.id === id ? { ...item, so_luong_nhap_bu: numValue } : item
    ));
  };
  
  const handleConfirmNhapBu = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const updatePromises = nhapBuItems.map(async (item) => {
        const { error: updErr } = await supabase
          .from('dang_ky_sd')
          .update({ 
            da_linh: true, 
            ngay_linh: todayStr,
            so_luong_nhap_bu: item.so_luong_nhap_bu 
          })
          .eq('id', item.id);
        if (updErr) throw updErr;
        
        const { error: rpcErr } = await supabase.rpc('cong_co_so', {
          p_vat_tu_id: item.vat_tu_id,
          p_so_luong: item.so_luong_nhap_bu || 0
        });
        if (rpcErr) throw rpcErr;
      });
      
      await Promise.all(updatePromises);
      
      setShowNhapBuModal(false);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi nhập bù');
    }
  };

  const handleDeleteReg = async (reg) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phiếu đăng ký này? Tất cả vật tư trong phiếu sẽ bị xóa.')) return;
    try {
      if (!reg.da_linh) {
        const restorePromises = reg.items.map(async (item) => {
          await supabase.rpc('cong_co_so', {
            p_vat_tu_id: item.vat_tu_id,
            p_so_luong: item.so_luong || 0
          });
        });
        await Promise.all(restorePromises);
      }
      
      const { error } = await supabase
        .from('dang_ky_sd')
        .delete()
        .eq('ma_phieu', reg.ma_phieu);
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

  const handleExportExcel = () => {
    const headers = ['Mã Phiếu', 'Ngày đăng ký', 'Bệnh nhân/Ghi chú', 'Trạng thái', 'Tên vật tư', 'ĐVT', 'Số lượng', 'Người đăng ký'];
    
    const rows = [];
    filteredRegs.forEach(reg => {
      const nguoiKiem = profilesMap[reg.nguoi_dang_ky] || reg.nguoi_dang_ky || 'Không rõ';
      const trangThai = reg.da_linh ? 'Đã lĩnh' : 'Chưa lĩnh';
      
      if (reg.items && reg.items.length > 0) {
        reg.items.forEach(item => {
          rows.push([
            reg.ma_phieu,
            reg.ngay_dang_ky,
            reg.ghi_chu || '',
            trangThai,
            item.ten_vtyt || '',
            item.dvt || '',
            item.so_luong,
            nguoiKiem
          ]);
        });
      } else {
        rows.push([
          reg.ma_phieu,
          reg.ngay_dang_ky,
          reg.ghi_chu || '',
          trangThai,
          '',
          '',
          '',
          nguoiKiem
        ]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DangKySD");
    XLSX.writeFile(workbook, `DangKySD_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const headers = ['Ngày đăng ký (YYYY-MM-DD)', 'Bệnh nhân/Ghi chú', 'Tên vật tư (Chính xác theo danh mục)', 'Số lượng'];
    const rows = [
      ['2026-07-19', 'Nguyễn Văn A', 'Băng dính lụa (2.5cm x 500cm)', 2],
      ['2026-07-19', 'Nguyễn Văn A', 'Bơm tiêm 5ml', 5]
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauNhap");
    XLSX.writeFile(workbook, `MauNhapDangKySD.xlsx`);
  };

  return (
    <div>
      <div className="title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Đăng ký Sử dụng Vật tư</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Quản lý và lĩnh bù các phiếu vật tư y tế đã sử dụng tại tủ trực
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {profile?.vai_tro === 'admin' && (
            <>
              <button className="btn btn-secondary" style={{ backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db' }} onClick={handleDownloadTemplate} title="Tải file mẫu">
                <FileText size={18} />
                <span className="hide-mobile">Tải file mẫu</span>
              </button>
              <button className="btn btn-secondary" style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }} onClick={handleExportExcel} title="Xuất Excel">
                <Download size={18} />
                <span className="hide-mobile">Xuất Excel</span>
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/dang-ky-su-dung/moi')}>
            <Plus size={18} />
            <span>Tạo phiếu mới</span>
          </button>
        </div>
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
                                onClick={(e) => { e.stopPropagation(); handleOpenNhapBu(reg); }}
                                title="Đánh dấu đã nhập bù toàn bộ phiếu"
                              >
                                <Check size={14} />
                                <span className="hide-mobile">Nhập bù</span>
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
                                onClick={(e) => { e.stopPropagation(); handleDeleteReg(reg); }}
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
      {showNhapBuModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ padding: '12px 16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                Nhập bù cơ số 
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '4px 12px' }} onClick={() => setShowNhapBuModal(false)}>Huỷ</button>
                <button type="button" className="btn btn-primary btn-sm" style={{ padding: '4px 12px' }} onClick={handleConfirmNhapBu}>Lưu</button>
              </div>
            </div>
            
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div className="table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#059669', color: 'white' }}>
                      <th style={{ textAlign: 'center', padding: '12px 8px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'white' }}>Tên vật tư</th>
                      <th style={{ width: '100px', textAlign: 'center', padding: '12px 8px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'white' }}>Nhập bù</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nhapBuItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #d1d5db' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          {item.ten_vtyt}
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đã SD: {item.so_luong}</div>
                        </td>
                        <td style={{ padding: '0', textAlign: 'center' }}>
                          <input 
                            type="number" 
                            value={item.so_luong_nhap_bu} 
                            onChange={(e) => handleNhapBuChange(item.id, e.target.value)}
                            style={{ width: '100%', height: '100%', minHeight: '44px', padding: '12px 8px', border: 'none', textAlign: 'center', color: '#0d9488', fontWeight: 'bold', fontSize: '1.1rem', outline: 'none', backgroundColor: 'transparent' }}
                            min="0"
                            step="any"
                            required
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
