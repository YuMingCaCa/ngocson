import { db, collection, addDoc, Timestamp } from '../config/firebase.js';
import { RESTAURANT_ID } from '../config.js';

// --- Lấy các phần tử HTML (Nhập hàng) ---
const formNhapHang = document.getElementById('form-nhap-hang');
const inputTenSanPham = document.getElementById('ten-san-pham');
const inputSoLuong = document.getElementById('so-luong');
const inputDonViTinh = document.getElementById('don-vi-tinh');
const inputDonGia = document.getElementById('don-gia');
const inputNhaCungCap = document.getElementById('nha-cung-cap');
const inputNgayNhap = document.getElementById('ngay-nhap');

async function themLichSuNhapHang(e, onDataChangedCallback) {
  e.preventDefault();
  const soLuong = parseFloat(inputSoLuong.value);
  const donGia = parseFloat(inputDonGia.value);
  const ngayNhapValue = inputNgayNhap.value;
  if (!ngayNhapValue) {
    alert('Bạn vui lòng chọn ngày nhập hàng!');
    return;
  }
  const selectedDate = new Date(ngayNhapValue + 'T00:00:00');
  const chiTietNhapHang = {
    ten_san_pham: inputTenSanPham.value,
    so_luong: soLuong,
    don_vi_tinh: inputDonViTinh.value,
    don_gia: donGia,
    thanh_tien: soLuong * donGia,
    ngay_nhap: Timestamp.fromDate(selectedDate),
    nha_cung_cap: inputNhaCungCap.value || ""
  };
  try {
    await addDoc(collection(db, "restaurants", RESTAURANT_ID, "purchase_history"), chiTietNhapHang);
    alert('Thêm dữ liệu thành công!');
    formNhapHang.reset();
    setInitialDates(); // Đặt lại ngày mặc định sau khi thêm
    
    // Gọi hàm callback để thông báo cho app.js biết cần làm mới báo cáo
    if (onDataChangedCallback) onDataChangedCallback();
  } catch (error) {
    console.error("Lỗi khi thêm dữ liệu: ", error);
    alert('Có lỗi xảy ra, vui lòng thử lại.');
  }
}

function setInitialDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    if (inputNgayNhap) inputNgayNhap.value = `${year}-${month}-${day}`;
}

// Hàm khởi tạo cho module này
export function initNhapHang(onDataChangedCallback) {
    if (formNhapHang) formNhapHang.addEventListener('submit', (e) => themLichSuNhapHang(e, onDataChangedCallback));
    setInitialDates();
}
