-- =============================================================
-- SCHEMA: Quản lý kho vật tư y tế (VTYT)
-- Chạy trong Supabase SQL Editor theo đúng thứ tự từ trên xuống
-- =============================================================

-- -------------------------------------------------------------
-- 1. BẢNG DANH MỤC VẬT TƯ (danh_muc)
-- -------------------------------------------------------------
create table if not exists danh_muc (
  id uuid primary key default gen_random_uuid(),
  tt integer,                                  -- số thứ tự hiển thị
  ten_vtyt text not null,                       -- tên vật tư y tế
  dvt text not null,                            -- đơn vị tính (cái, hộp, chai, gói...)
  co_so numeric not null default 0,             -- cơ số quy định (định mức tối thiểu phải có)
  co_so_dia_diem text,                          -- cơ sở/tủ trực
  trang_thai text not null default 'Còn hàng'   -- 'Còn hàng' | 'Hết hàng'
    check (trang_thai in ('Còn hàng', 'Hết hàng')),
  ghi_chu text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists danh_muc_ten_vtyt_uniq on danh_muc (lower(ten_vtyt));

-- -------------------------------------------------------------
-- 2. NGƯỜI DÙNG — profiles
-- -------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(), -- Bỏ references auth.users(id) để dễ dàng thêm user thủ công
  username text unique,
  ho_ten text not null,
  mat_khau text, -- Mật khẩu tạo thủ công cho tài khoản
  vai_tro text not null default 'nhan_vien'
    check (vai_tro in ('admin', 'quan_ly_kho', 'nhan_vien')),
  created_at timestamptz not null default now()
);

-- Tự tạo profile rỗng khi có user mới đăng ký qua Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, ho_ten, vai_tro)
  values (new.id, coalesce(new.raw_user_meta_data->>'ho_ten', ''), 'nhan_vien');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -------------------------------------------------------------
-- 3. BẢNG ĐĂNG KÝ SỬ DỤNG (dang_ky_sd)
-- -------------------------------------------------------------
create table if not exists dang_ky_sd (
  id uuid primary key default gen_random_uuid(),
  ngay_dang_ky date not null default current_date,
  vat_tu_id uuid not null references danh_muc(id),
  so_luong numeric not null check (so_luong > 0),
  da_linh boolean not null default false,
  ngay_linh date,
  nguoi_dang_ky uuid references profiles(id),
  ghi_chu text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dang_ky_sd_chua_linh on dang_ky_sd (da_linh) where da_linh = false;
create index if not exists idx_dang_ky_sd_vat_tu on dang_ky_sd (vat_tu_id);

-- -------------------------------------------------------------
-- 4. BẢNG KIỂM KÊ (kiem_ke)
-- -------------------------------------------------------------
create table if not exists kiem_ke (
  id uuid primary key default gen_random_uuid(),
  ngay_kiem_ke date not null default current_date,
  vat_tu_id uuid not null references danh_muc(id),
  sl_kiem_ke_thuc_te numeric not null default 0,
  sl_da_su_dung_chua_linh numeric not null default 0,
  tong_so_luong numeric generated always as
    (sl_kiem_ke_thuc_te + sl_da_su_dung_chua_linh) stored,
  nguoi_kiem_ke uuid references profiles(id),
  ghi_chu text,
  loai_kiem_ke varchar(20) default 'Thủ công',
  created_at timestamptz not null default now()
);

create index if not exists idx_kiem_ke_vat_tu on kiem_ke (vat_tu_id);
create index if not exists idx_kiem_ke_ngay on kiem_ke (ngay_kiem_ke desc);

-- -------------------------------------------------------------
-- 5. VIEW: kiểm kê kèm thừa/thiếu so với cơ số
-- -------------------------------------------------------------
create or replace view v_kiem_ke_chi_tiet as
select
  kk.id,
  kk.ngay_kiem_ke,
  dm.id            as vat_tu_id,
  dm.ten_vtyt,
  dm.dvt,
  dm.co_so,
  kk.sl_kiem_ke_thuc_te,
  kk.sl_da_su_dung_chua_linh,
  kk.tong_so_luong,
  (kk.tong_so_luong - dm.co_so)              as thua_thieu,
  case
    when kk.tong_so_luong - dm.co_so < 0 then 'Thiếu'
    when kk.tong_so_luong - dm.co_so > 0 then 'Thừa'
    else 'Đủ'
  end as tinh_trang,
  kk.nguoi_kiem_ke,
  kk.ghi_chu,
  kk.loai_kiem_ke
from kiem_ke kk
join danh_muc dm on dm.id = kk.vat_tu_id;

-- View phụ cho Dashboard
create or replace view v_kiem_ke_moi_nhat as
select distinct on (vat_tu_id) *
from v_kiem_ke_chi_tiet
order by vat_tu_id, ngay_kiem_ke desc;

-- -------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------
alter table danh_muc enable row level security;
alter table profiles enable row level security;
alter table dang_ky_sd enable row level security;
alter table kiem_ke enable row level security;

create policy "Cho phép toàn quyền trên danh_muc" on danh_muc for all to anon using (true);
create policy "Cho phép toàn quyền trên profiles" on profiles for all to anon using (true);
create policy "Cho phép toàn quyền trên dang_ky_sd" on dang_ky_sd for all to anon using (true);
create policy "Cho phép toàn quyền trên kiem_ke" on kiem_ke for all to anon using (true);
