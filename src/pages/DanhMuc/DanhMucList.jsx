import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import DanhMucForm from './DanhMucForm';
import { Plus, Search, Trash2, Save, X } from 'lucide-react';

export default function DanhMucList() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Còn hàng');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal state for Add New or Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Bulk Edit state
  const [modifiedItems, setModifiedItems] = useState({});
  const [savingBulk, setSavingBulk] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDanhMuc = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('danh_muc')
        .select('*')
        .order('tt', { ascending: true });

      if (statusFilter !== 'Tất cả') {
        query = query.eq('trang_thai', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching medical supplies list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDanhMuc();
  }, [statusFilter]);

  const handleAddClick = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    fetchDanhMuc();
  };

  const handleInputChange = (id, field, value) => {
    setModifiedItems(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const handleCancelBulkEdit = () => {
    setModifiedItems({});
  };

  const handleBulkSave = async () => {
    const ids = Object.keys(modifiedItems);
    if (ids.length === 0) return;
    
    setSavingBulk(true);
    try {
      const promises = ids.map(id => {
        // Prepare payload, convert some fields to numbers if needed
        const payload = { ...modifiedItems[id], updated_at: new Date().toISOString() };
        if (payload.tt !== undefined && payload.tt !== '') payload.tt = Number(payload.tt);
        if (payload.co_so !== undefined) payload.co_so = Number(payload.co_so);
        
        return supabase.from('danh_muc').update(payload).eq('id', id);
      });
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
      
      setModifiedItems({});
      fetchDanhMuc();
    } catch (err) {
      alert('Lỗi khi lưu thay đổi hàng loạt: ' + err.message);
    } finally {
      setSavingBulk(false);
    }
  };

  const handleDeleteClick = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá vật tư "${name}"?`)) return;
    
    try {
      const { error } = await supabase.from('danh_muc').delete().eq('id', id);
      if (error) throw error;
      fetchDanhMuc();
    } catch (err) {
      alert('Lỗi xoá vật tư: ' + err.message);
    }
  };

  const filteredItems = items.filter(item => 
    item.ten_vtyt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.ghi_chu && item.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredItems.length / itemsPerPage);
  
  const currentItems = itemsPerPage === 'all' 
    ? filteredItems 
    : filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isEditable = profile && (profile.vai_tro === 'admin' || profile.vai_tro === 'quan_ly_kho');

  return (
    <div>
      <div className="title-container">
        <div>
          <h2>Danh mục Vật tư Y tế</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Xem định mức cơ số vật tư y tế và tủ trực
          </p>
        </div>
        {isEditable && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.keys(modifiedItems).length > 0 && (
              <>
                <button className="btn btn-secondary" onClick={handleCancelBulkEdit} disabled={savingBulk} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <X size={18} /> Hủy thay đổi
                </button>
                <button className="btn btn-primary" onClick={handleBulkSave} disabled={savingBulk} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--success)' }}>
                  <Save size={18} /> {savingBulk ? 'Đang lưu...' : `Lưu thay đổi (${Object.keys(modifiedItems).length})`}
                </button>
              </>
            )}
            <button className="btn btn-primary btn-add-desktop" onClick={handleAddClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Thêm vật tư
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="card filters-panel">
        <div className="search-input" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên vật tư..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Còn hàng">Còn hàng</option>
            <option value="Hết hàng">Hết hàng</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: '200px' }}>
          <div className="spinner"></div>
          <p>Đang tải danh mục vật tư...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Không tìm thấy vật tư y tế nào.
        </div>
      ) : (
        <div className="card" style={{ padding: '8px' }}>
          <div className="table-wrapper">
            <table className="responsive-table table-mobile-3col" style={{ tableLayout: window.innerWidth <= 768 ? 'fixed' : 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: window.innerWidth <= 768 ? '30px' : '40px', padding: '10px 2px', textAlign: 'center' }}>TT</th>
                  <th style={{ width: 'auto' }}>Tên vật tư</th>
                  <th className="hide-mobile">Đơn vị tính</th>
                  <th style={{ width: '60px', textAlign: 'center', padding: '10px 2px' }}>Số lượng</th>
                  <th className="hide-mobile">Trạng thái</th>
                  <th className="hide-mobile">Ghi chú</th>
                  {isEditable && <th className="hide-mobile" style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => {
                  const itemChanges = modifiedItems[item.id] || {};
                  const isHetHang = (itemChanges.trang_thai ?? item.trang_thai) === 'Hết hàng';
                  const rowStyle = Object.keys(itemChanges).length > 0 
                    ? { backgroundColor: 'var(--info-glow)' } 
                    : {};
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={isHetHang ? 'row-het-hang' : ''} 
                      style={rowStyle}
                      onClick={() => {
                        if (window.innerWidth <= 768) {
                          handleEditClick(item);
                        }
                      }}
                    >
                      <td data-label="TT" style={{ textAlign: 'center' }}>
                        {(isEditable && !isMobile) ? (
                          <input 
                            type="number" className="form-control" 
                            style={{ padding: '6px', margin: 0, width: '50px', textAlign: 'center', margin: '0 auto' }}
                            value={itemChanges.tt ?? item.tt ?? ''}
                            onChange={(e) => handleInputChange(item.id, 'tt', e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: '600' }}>{item.tt || '-'}</span>
                        )}
                      </td>
                      <td data-label="Tên vật tư">
                        {(isEditable && !isMobile) ? (
                          <textarea 
                            className="form-control" 
                            style={{ padding: '6px', margin: 0, minWidth: '100px', minHeight: '44px', resize: 'vertical' }}
                            value={itemChanges.ten_vtyt ?? item.ten_vtyt}
                            onChange={(e) => handleInputChange(item.id, 'ten_vtyt', e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: '500', wordWrap: 'break-word', whiteSpace: 'normal', display: 'block' }}>{item.ten_vtyt}</span>
                        )}
                      </td>
                      <td data-label="Đơn vị tính" className="hide-mobile">
                        {(isEditable && !isMobile) ? (
                          <select 
                            className="form-control" 
                            style={{ padding: '6px', margin: 0 }}
                            value={itemChanges.dvt ?? item.dvt}
                            onChange={(e) => handleInputChange(item.id, 'dvt', e.target.value)}
                          >
                            {['Cái', 'Hộp', 'Lọ', 'Sợi', 'Cuộn', 'Tép', 'Chai', 'Gói', 'Ống', 'Bộ'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : item.dvt}
                      </td>
                      <td data-label="Số lượng" style={{ textAlign: 'center' }}>
                        {(isEditable && !isMobile) ? (
                          <input 
                            type="number" className="form-control" 
                            style={{ padding: '6px', margin: 0, width: '60px', color: 'var(--primary-light)', fontWeight: '600', textAlign: 'center', margin: '0 auto' }}
                            value={itemChanges.co_so ?? item.co_so}
                            onChange={(e) => handleInputChange(item.id, 'co_so', e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: '600', color: 'var(--primary-light)' }}>{item.co_so}</span>
                        )}
                      </td>
                      <td data-label="Trạng thái" className="hide-mobile">
                        {(isEditable && !isMobile) ? (
                          <select 
                            className="form-control" 
                            style={{ padding: '6px', margin: 0 }}
                            value={itemChanges.trang_thai ?? item.trang_thai}
                            onChange={(e) => handleInputChange(item.id, 'trang_thai', e.target.value)}
                          >
                            <option value="Còn hàng">Còn hàng</option>
                            <option value="Hết hàng">Hết hàng</option>
                          </select>
                        ) : (
                          <span className={`badge ${item.trang_thai === 'Còn hàng' ? 'success' : 'danger'}`}>
                            {item.trang_thai}
                          </span>
                        )}
                      </td>
                      <td data-label="Ghi chú" className="hide-mobile">
                        {(isEditable && !isMobile) ? (
                          <input 
                            type="text" className="form-control" 
                            style={{ padding: '6px', margin: 0 }}
                            placeholder="Ghi chú..."
                            value={itemChanges.ghi_chu ?? item.ghi_chu ?? ''}
                            onChange={(e) => handleInputChange(item.id, 'ghi_chu', e.target.value)}
                          />
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.ghi_chu || '-'}</span>
                        )}
                      </td>
                      {isEditable && (
                        <td data-label="Thao tác" className="hide-mobile" style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', minWidth: 'auto', display: 'flex', alignItems: 'center', color: 'var(--danger)', borderColor: 'var(--danger-border, #fca5a5)', margin: '0 auto' }}
                            onClick={() => handleDeleteClick(item.id, item.ten_vtyt)}
                            title="Xóa vật tư"
                            disabled={savingBulk}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '16px', padding: '0 8px 8px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Hiển thị:</span>
                <select 
                  className="form-control" 
                  style={{ padding: '4px 8px', width: 'auto', margin: 0, height: 'auto', minHeight: '32px' }}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value="all">Tất cả</option>
                </select>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  / Tổng {filteredItems.length} vật tư
                </span>
              </div>
              
              {itemsPerPage !== 'all' && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', minWidth: 'auto' }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    Trước
                  </button>
                  <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', minWidth: 'auto' }}
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form Modal overlay for Add New / Edit */}
      {isModalOpen && (
        <DanhMucForm
          item={selectedItem}
          maxTt={items.length > 0 ? Math.max(...items.map(i => parseInt(i.tt) || 0)) : 0}
          onSave={handleSaveSuccess}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
          }}
          onDelete={isEditable && selectedItem ? () => {
            handleDeleteClick(selectedItem.id, selectedItem.ten_vtyt);
            setIsModalOpen(false);
            setSelectedItem(null);
          } : null}
        />
      )}
      
      {/* FAB cho Mobile */}
      {isEditable && (
        <div className="fab-container">
          <button className="fab-button" onClick={handleAddClick} title="Thêm vật tư">
            <Plus size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
