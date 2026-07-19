import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are set and are not placeholder values
const isRealSupabaseConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

let supabaseClientInstance;

if (isRealSupabaseConfigured) {
  supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // --- MOCK DATABASE IMPLEMENTATION ---
  console.warn(
    'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured. Falling back to Mock LocalStorage Database Layer.'
  );

  const STORAGE_PREFIX = 'ttvtb5_mock_';

  const initialDanhMuc = [
    { id: 'dm-1', tt: 1, ten_vtyt: 'Bơm tiêm 10ml', dvt: 'Cái', co_so: 100, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: 'Hàng cơ số cố định' },
    { id: 'dm-2', tt: 2, ten_vtyt: 'Kháng sinh Ceftriaxone 1g', dvt: 'Lọ', co_so: 50, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: 'Bảo quản mát' },
    { id: 'dm-3', tt: 3, ten_vtyt: 'Dây dịch truyền cánh bướm', dvt: 'Sợi', co_so: 40, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' },
    { id: 'dm-4', tt: 4, ten_vtyt: 'Bông hút nước y tế 100g', dvt: 'Cuộn', co_so: 10, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' },
    { id: 'dm-5', tt: 5, ten_vtyt: 'Găng tay khám bệnh không bột', dvt: 'Hộp', co_so: 15, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' },
    { id: 'dm-6', tt: 6, ten_vtyt: 'Chỉ phẫu thuật Silk 3.0', dvt: 'Tép', co_so: 20, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' },
    { id: 'dm-7', tt: 7, ten_vtyt: 'Cồn đỏ Povidine 10% 90ml', dvt: 'Chai', co_so: 8, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' },
    { id: 'dm-8', tt: 8, ten_vtyt: 'Mặt nạ thở oxy người lớn', dvt: 'Cái', co_so: 12, co_so_dia_diem: 'Tủ cấp cứu A', trang_thai: 'Đang dùng', ghi_chu: '' }
  ];

  const initialProfiles = [
    { id: 'user-admin', username: 'admin', ho_ten: 'Nguyễn Văn Admin', vai_tro: 'admin' },
    { id: 'user-quanly', username: 'quanly', ho_ten: 'Trần Thị Kho', vai_tro: 'quan_ly_kho' },
    { id: 'user-nhanvien', username: 'nhanvien', ho_ten: 'Lê Văn Nhân Viên', vai_tro: 'nhan_vien' }
  ];

  const initialDangKy = [
    { id: 'dk-1', ngay_dang_ky: '2026-07-18', vat_tu_id: 'dm-1', so_luong: 15, da_linh: false, ngay_linh: null, nguoi_dang_ky: 'user-nhanvien', ghi_chu: 'Dùng cấp cứu bệnh nhân A' },
    { id: 'dk-2', ngay_dang_ky: '2026-07-18', vat_tu_id: 'dm-2', so_luong: 8, da_linh: false, ngay_linh: null, nguoi_dang_ky: 'user-nhanvien', ghi_chu: 'Bệnh nhi sốt xuất huyết' },
    { id: 'dk-3', ngay_dang_ky: '2026-07-17', vat_tu_id: 'dm-3', so_luong: 10, da_linh: true, ngay_linh: '2026-07-18', nguoi_dang_ky: 'user-nhanvien', ghi_chu: 'Lĩnh bù ca trực trước' }
  ];

  const initialKiemKe = [
    { id: 'kk-1', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-1', sl_kiem_ke_thuc_te: 70, sl_da_su_dung_chua_linh: 15, nguoi_kiem_ke: 'user-quanly', ghi_chu: 'Kỳ kiểm định sáng thứ 7' },
    { id: 'kk-2', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-2', sl_kiem_ke_thuc_te: 35, sl_da_su_dung_chua_linh: 8, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' },
    { id: 'kk-3', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-3', sl_kiem_ke_thuc_te: 42, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' },
    { id: 'kk-4', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-4', sl_kiem_ke_thuc_te: 5, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' },
    { id: 'kk-5', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-5', sl_kiem_ke_thuc_te: 16, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' },
    { id: 'kk-6', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-6', sl_kiem_ke_thuc_te: 20, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' },
    { id: 'kk-7', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-7', sl_kiem_ke_thuc_te: 4, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: 'Hụt cồn' },
    { id: 'kk-8', ngay_kiem_ke: '2026-07-18', vat_tu_id: 'dm-8', sl_kiem_ke_thuc_te: 12, sl_da_su_dung_chua_linh: 0, nguoi_kiem_ke: 'user-quanly', ghi_chu: '' }
  ];

  const initializeLocalStorage = () => {
    if (!localStorage.getItem(STORAGE_PREFIX + 'danh_muc')) {
      localStorage.setItem(STORAGE_PREFIX + 'danh_muc', JSON.stringify(initialDanhMuc));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'profiles')) {
      localStorage.setItem(STORAGE_PREFIX + 'profiles', JSON.stringify(initialProfiles));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'dang_ky_sd')) {
      localStorage.setItem(STORAGE_PREFIX + 'dang_ky_sd', JSON.stringify(initialDangKy));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'kiem_ke')) {
      localStorage.setItem(STORAGE_PREFIX + 'kiem_ke', JSON.stringify(initialKiemKe));
    }
    if (!localStorage.getItem(STORAGE_PREFIX + 'session')) {
      localStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify({
        user: { id: 'user-nhanvien', email: 'nhanvien@example.com', raw_user_meta_data: { ho_ten: 'Lê Văn Nhân Viên' } }
      }));
    }
  };

  initializeLocalStorage();

  const getDBTable = (table) => {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + table) || '[]');
  };

  const saveDBTable = (table, data) => {
    localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(data));
  };

  const executeMockQuery = (table, filters = [], sort = null, limitCount = null) => {
    let raw = getDBTable(table);

    // Apply custom views simulation
    if (table === 'v_kiem_ke_chi_tiet' || table === 'v_kiem_ke_moi_nhat') {
      const kiemKe = getDBTable('kiem_ke');
      const danhMuc = getDBTable('danh_muc');
      
      let mapped = kiemKe.map(kk => {
        const dm = danhMuc.find(item => item.id === kk.vat_tu_id) || {};
        const tong_so_luong = Number(kk.sl_kiem_ke_thuc_te) + Number(kk.sl_da_su_dung_chua_linh);
        const co_so = Number(dm.co_so || 0);
        const thua_thieu = tong_so_luong - co_so;
        let tinh_trang = 'Đủ';
        if (thua_thieu < 0) tinh_trang = 'Thiếu';
        if (thua_thieu > 0) tinh_trang = 'Thừa';

        return {
          id: kk.id,
          ngay_kiem_ke: kk.ngay_kiem_ke,
          vat_tu_id: kk.vat_tu_id,
          ten_vtyt: dm.ten_vtyt || 'Đã xoá',
          dvt: dm.dvt || '',
          co_so: co_so,
          sl_kiem_ke_thuc_te: Number(kk.sl_kiem_ke_thuc_te),
          sl_da_su_dung_chua_linh: Number(kk.sl_da_su_dung_chua_linh),
          tong_so_luong: tong_so_luong,
          thua_thieu: thua_thieu,
          tinh_trang: tinh_trang,
          nguoi_kiem_ke: kk.nguoi_kiem_ke,
          ghi_chu: kk.ghi_chu
        };
      });

      if (table === 'v_kiem_ke_moi_nhat') {
        // Group by vat_tu_id and take latest ngay_kiem_ke
        const latest = {};
        mapped.forEach(item => {
          const current = latest[item.vat_tu_id];
          if (!current || new Date(item.ngay_kiem_ke) > new Date(current.ngay_kiem_ke)) {
            latest[item.vat_tu_id] = item;
          }
        });
        raw = Object.values(latest);
      } else {
        raw = mapped;
      }
    }

    // Apply joins simulated
    if (table === 'dang_ky_sd') {
      const danhMuc = getDBTable('danh_muc');
      raw = raw.map(dk => {
        const dm = danhMuc.find(item => item.id === dk.vat_tu_id) || {};
        return {
          ...dk,
          danh_muc: {
            ten_vtyt: dm.ten_vtyt || 'Đã xoá',
            dvt: dm.dvt || ''
          }
        };
      });
    }

    // Apply filters
    filters.forEach(f => {
      const { column, operator, value } = f;
      if (operator === 'eq') {
        raw = raw.filter(item => {
          if (column.includes('.')) {
            const parts = column.split('.');
            return item[parts[0]]?.[parts[1]] === value;
          }
          return item[column] === value;
        });
      } else if (operator === 'neq') {
        raw = raw.filter(item => item[column] !== value);
      } else if (operator === 'not_in') {
        // value is like '(select vat_tu_id from kiem_ke)' - we mock it
        if (column === 'id' && value.includes('kiem_ke')) {
          const kiemKe = getDBTable('kiem_ke');
          const kiemKeIds = new Set(kiemKe.map(k => k.vat_tu_id));
          raw = raw.filter(item => !kiemKeIds.has(item.id));
        }
      }
    });

    // Apply sort
    if (sort) {
      const { column, ascending } = sort;
      raw.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        if (typeof valA === 'string') {
          return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return ascending ? valA - valB : valB - valA;
      });
    }

    // Apply limit
    if (limitCount) {
      raw = raw.slice(0, limitCount);
    }

    return raw;
  };

  class MockBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.sort = null;
      this.limitCount = null;
      this.exactCount = false;
    }

    select(columns, options = {}) {
      if (options.count === 'exact') {
        this.exactCount = true;
      }
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, operator: 'eq', value });
      return this;
    }

    neq(column, value) {
      this.filters.push({ column, operator: 'neq', value });
      return this;
    }

    not(column, operator, value) {
      if (operator === 'in') {
        this.filters.push({ column, operator: 'not_in', value });
      }
      return this;
    }

    order(column, options = {}) {
      this.sort = { column, ascending: options.ascending ?? true };
      return this;
    }

    limit(count) {
      this.limitCount = count;
      return this;
    }

    async then(resolve) {
      const data = executeMockQuery(this.table, this.filters, this.sort, this.limitCount);
      const count = this.exactCount ? data.length : null;
      resolve({ data, count, error: null });
    }

    async insert(records) {
      const tableData = getDBTable(this.table);
      const toInsert = Array.isArray(records) ? records : [records];
      
      const newRecords = toInsert.map(record => ({
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        ...record
      }));

      saveDBTable(this.table, [...tableData, ...newRecords]);
      return { data: newRecords, error: null };
    }

    async update(changes) {
      let tableData = getDBTable(this.table);
      let updatedCount = 0;
      
      tableData = tableData.map(item => {
        let match = true;
        this.filters.forEach(f => {
          if (f.operator === 'eq' && item[f.column] !== f.value) {
            match = false;
          }
        });

        if (match) {
          updatedCount++;
          return { ...item, ...changes };
        }
        return item;
      });

      saveDBTable(this.table, tableData);
      return { data: null, error: null, count: updatedCount };
    }

    async delete() {
      let tableData = getDBTable(this.table);
      const initialLength = tableData.length;
      
      tableData = tableData.filter(item => {
        let match = true;
        this.filters.forEach(f => {
          if (f.operator === 'eq' && item[f.column] !== f.value) {
            match = false;
          }
        });
        return !match;
      });

      saveDBTable(this.table, tableData);
      return { error: null, count: initialLength - tableData.length };
    }
  }

  supabaseClientInstance = {
    from: (table) => new MockBuilder(table),
    auth: {
      getSession: async () => {
        const session = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'session'));
        return { data: { session }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const username = email.split('@')[0];
        const profiles = getDBTable('profiles');
        const profile = profiles.find(p => p.username === username);

        if (profile) {
          const userSession = {
            user: { id: profile.id, email: `${profile.username}@example.com`, raw_user_meta_data: { ho_ten: profile.ho_ten } }
          };
          localStorage.setItem(STORAGE_PREFIX + 'session', JSON.stringify(userSession));
          return { data: { user: userSession.user, session: userSession }, error: null };
        }
        return { data: null, error: { message: 'Tên đăng nhập không đúng (Thử lại: admin, quanly, hoặc nhanvien)' } };
      },
      signOut: async () => {
        localStorage.removeItem(STORAGE_PREFIX + 'session');
        return { error: null };
      },
      onAuthStateChange: (callback) => {
        // Simulating callback for state changes
        const trigger = () => {
          const session = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'session'));
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        };
        window.addEventListener('storage', trigger);
        setTimeout(trigger, 10);
        return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', trigger) } } };
      }
    }
  };
}

export const supabase = supabaseClientInstance;
