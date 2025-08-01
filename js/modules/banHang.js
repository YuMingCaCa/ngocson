import { db, collection, addDoc, doc, setDoc, onSnapshot, deleteDoc, Timestamp, query, getDoc } from '../config/firebase.js';
import { RESTAURANT_ID, RESTAURANT_NAME } from '../config.js';
import { currencyFormatter } from '../utils/formatters.js';
import { menuData } from './menu.js';
import { danhSachBanData } from './ban.js';

// =================================================================
// --- CẤU HÌNH & KHAI BÁO ---
// =================================================================

// Lấy các phần tử HTML
const danhSachBanDiv = document.getElementById('danh-sach-ban');
const soBanHienTaiSpan = document.getElementById('so-ban-hien-tai');
const formOrderWrapper = document.getElementById('form-order-wrapper');
const formGoiMon = document.getElementById('form-goi-mon');
const inputTenMon = document.getElementById('ten-mon');
const inputSoLuongMon = document.getElementById('so-luong-mon');
const inputDonGiaMon = document.getElementById('don-gia-mon');
const bangChiTietMonBody = document.querySelector('#bang-chi-tiet-mon tbody');
const strongTamTinh = document.getElementById('tam-tinh');
const btnInHoaDon = document.getElementById('btn-in-hoa-don');
const btnThanhToan = document.getElementById('btn-thanh-toan');

// Biến trạng thái của module
let banDuocChon = null; // Lưu số của bàn đang được chọn, ví dụ: '1'
let donHangCuaCacBan = new Map(); // Lưu trạng thái tất cả các bàn đang có khách

// =================================================================
// --- CÁC HÀM RENDER GIAO DIỆN ---
// =================================================================

/**
 * Vẽ lại toàn bộ lưới bàn ăn dựa trên trạng thái mới nhất.
 */
export function renderLuoiBanAn() {
    danhSachBanDiv.innerHTML = ''; // Xóa các bàn cũ
    danhSachBanData.forEach(soBan => {
        const banElement = document.createElement('button');
        banElement.classList.add('table-item');
        banElement.textContent = soBan;
        banElement.dataset.soBan = soBan;

        // Thêm class 'occupied' nếu bàn có khách
        if (donHangCuaCacBan.has(soBan)) {
            banElement.classList.add('occupied');
        }

        // Thêm class 'selected' nếu là bàn đang được chọn
        if (soBan === banDuocChon) {
            banElement.classList.add('selected');
        }

        danhSachBanDiv.appendChild(banElement);
    });
}

/**
 * Hiển thị chi tiết các món đã gọi của bàn được chọn.
 */
function renderChiTietDonHang() {
    const donHang = donHangCuaCacBan.get(banDuocChon);
    bangChiTietMonBody.innerHTML = ''; // Xóa chi tiết cũ

    if (!donHang) {
        bangChiTietMonBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Bàn trống, hãy gọi món!</td></tr>`;
        strongTamTinh.textContent = currencyFormatter.format(0);
        return;
    }

    donHang.chi_tiet_mon.forEach((mon, index) => {
        const row = bangChiTietMonBody.insertRow();
        row.innerHTML = `
            <td>${mon.ten_mon}</td>
            <td>${mon.so_luong}</td>
            <td>${currencyFormatter.format(mon.don_gia)}</td>
            <td><button class="btn-xoa-mon" data-index="${index}">Xóa</button></td>
        `;
    });
    strongTamTinh.textContent = currencyFormatter.format(donHang.tong_tien);
}

// =================================================================
// --- CÁC HÀM XỬ LÝ LOGIC ---
// =================================================================

/**
 * Xử lý khi người dùng nhấn vào một bàn.
 * @param {string} soBan - Số của bàn được nhấn.
 */
function chonBan(soBan) {
    banDuocChon = soBan;
    soBanHienTaiSpan.textContent = soBan;
    formOrderWrapper.style.display = 'block'; // Hiện form gọi món
    renderChiTietDonHang();
    renderLuoiBanAn(); // Vẽ lại lưới để highlight bàn được chọn
    inputTenMon.focus();
}

/**
 * Thêm món mới vào bàn đang được chọn.
 */
async function themMon(e) {
    e.preventDefault();
    if (!banDuocChon) {
        alert("Vui lòng chọn một bàn trước khi thêm món!");
        return;
    }

    const monMoi = {
        ten_mon: inputTenMon.value,
        so_luong: parseFloat(inputSoLuongMon.value),
        don_gia: parseFloat(inputDonGiaMon.value),
    };
    monMoi.thanh_tien = monMoi.so_luong * monMoi.don_gia;

    let donHangHienTai = donHangCuaCacBan.get(banDuocChon) || {
        ten_ban: banDuocChon,
        chi_tiet_mon: [],
        tong_tien: 0,
        thoi_gian_tao: Timestamp.now()
    };

    donHangHienTai.chi_tiet_mon.push(monMoi);
    donHangHienTai.tong_tien += monMoi.thanh_tien;

    const docRef = doc(db, "restaurants", RESTAURANT_ID, "current_orders", `ban_${banDuocChon}`);
    try {
        await setDoc(docRef, donHangHienTai);
        formGoiMon.reset();
        inputTenMon.focus();
    } catch (error) {
        console.error("Lỗi khi thêm món: ", error);
    }
}

/**
 * Xóa một món khỏi đơn hàng của bàn đang được chọn.
 */
async function xoaMon(e) {
    if (!e.target.classList.contains('btn-xoa-mon') || !banDuocChon) return;

    let donHangHienTai = donHangCuaCacBan.get(banDuocChon);
    if (!donHangHienTai) return;

    const index = parseInt(e.target.dataset.index);
    const monBiXoa = donHangHienTai.chi_tiet_mon[index];

    donHangHienTai.chi_tiet_mon.splice(index, 1);
    donHangHienTai.tong_tien -= monBiXoa.thanh_tien;

    const docRef = doc(db, "restaurants", RESTAURANT_ID, "current_orders", `ban_${banDuocChon}`);
    try {
        if (donHangHienTai.chi_tiet_mon.length === 0) {
            await deleteDoc(docRef); // Nếu hết món thì xóa luôn đơn hàng
        } else {
            await setDoc(docRef, donHangHienTai);
        }
    } catch (error) {
        console.error("Lỗi khi xóa món: ", error);
    }
}

/**
 * Tạo nội dung hóa đơn từ dữ liệu và mở cửa sổ in.
 * Hàm này có thể được tái sử dụng để in lại hóa đơn cũ.
 * @param {object} hoaDonData - Dữ liệu của hóa đơn cần in.
 */
export function generateAndPrintInvoice(hoaDonData) {
    if (!hoaDonData || !hoaDonData.chi_tiet_mon || hoaDonData.chi_tiet_mon.length === 0) {
        console.error("Dữ liệu hóa đơn không hợp lệ để in.");
        return;
    }

    // Nếu là hóa đơn cũ (có trường ngay_thanh_toan), dùng ngày đó. Nếu không, dùng ngày giờ hiện tại.
    const thoiGianHoaDon = hoaDonData.ngay_thanh_toan ? hoaDonData.ngay_thanh_toan.toDate() : new Date();
    const ngayIn = thoiGianHoaDon.toLocaleDateString('vi-VN');
    const gioIn = thoiGianHoaDon.toLocaleTimeString('vi-VN');

    let danhSachMonHTML = '';
    hoaDonData.chi_tiet_mon.forEach((mon, index) => {
        danhSachMonHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${mon.ten_mon}</td>
                <td>${mon.so_luong}</td>
                <td class="text-right">${mon.don_gia.toLocaleString('vi-VN')}</td>
                <td class="text-right">${(mon.so_luong * mon.don_gia).toLocaleString('vi-VN')}</td>
            </tr>
        `;
    });

    const htmlContent = `
        <html>
        <head>
            <title>Hóa Đơn Bàn ${hoaDonData.ten_ban}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 10px; font-size: 12px; }
                .invoice-box { max-width: 300px; margin: auto; padding: 10px; border: 1px solid #eee; box-shadow: 0 0 5px rgba(0, 0, 0, 0.15); }
                .header { text-align: center; margin-bottom: 10px; }
                .header h2 { margin: 0; font-size: 18px; }
                .header p { margin: 2px 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border-bottom: 1px dashed #ccc; padding: 5px 0; }
                th { text-align: left; }
                .total-row td { border-bottom: none; border-top: 1px solid #000; font-weight: bold; }
                .footer { text-align: center; margin-top: 15px; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <h2>${RESTAURANT_NAME}</h2>
                    <p>HÓA ĐƠN THANH TOÁN</p>
                    <p>Bàn: ${hoaDonData.ten_ban}</p>
                    <p>Ngày: ${ngayIn} - Giờ: ${gioIn}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Tên món</th><th>SL</th><th class="text-right">Đ.Giá</th><th class="text-right">T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>${danhSachMonHTML}</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="4">TỔNG CỘNG</td>
                            <td class="text-right">${currencyFormatter.format(hoaDonData.tong_tien)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div class="footer">
                    <p>Cảm ơn quý khách & hẹn gặp lại!</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '', 'height=700,width=500');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

/**
 * In hóa đơn cho bàn đang được chọn.
 */
function inHoaDon() {
    const donHangHienTai = donHangCuaCacBan.get(banDuocChon);
    if (!donHangHienTai || donHangHienTai.chi_tiet_mon.length === 0) {
        alert("Bàn trống hoặc chưa chọn bàn, không có gì để in!");
        return;
    }
    generateAndPrintInvoice(donHangHienTai);
}

/**
 * Hủy một hóa đơn đã thanh toán, mở lại bàn.
 * @param {string} hoaDonId - ID của hóa đơn trong collection lich_su_ban_hang.
 * @param {object} hoaDonData - Dữ liệu của hóa đơn đó.
 * @returns {Promise<boolean>} - Trả về true nếu thành công, false nếu thất bại.
 */
export async function huyThanhToan(hoaDonId, hoaDonData) {
    const tenBan = hoaDonData.ten_ban;
    const donHangHienTaiRef = doc(db, "restaurants", RESTAURANT_ID, "current_orders", `ban_${tenBan}`);

    try {
        // 1. Kiểm tra xem bàn có đang được sử dụng không
        const docSnap = await getDoc(donHangHienTaiRef);
        if (docSnap.exists()) {
            alert(`Không thể hủy thanh toán. Bàn "${tenBan}" hiện đang có khách!`);
            return false;
        }

        // 2. Tạo lại đơn hàng hiện tại từ dữ liệu hóa đơn cũ
        // Loại bỏ trường ngay_thanh_toan trước khi tạo lại
        const { ngay_thanh_toan, ...donHangDeMoLai } = hoaDonData;
        await setDoc(donHangHienTaiRef, donHangDeMoLai);

        // 3. Xóa hóa đơn khỏi lịch sử bán hàng
        const hoaDonLichSuRef = doc(db, "restaurants", RESTAURANT_ID, "sales_history", hoaDonId);
        await deleteDoc(hoaDonLichSuRef);

        alert(`Đã hủy thanh toán và mở lại bàn "${tenBan}" thành công!`);
        return true;

    } catch (error) {
        console.error("Lỗi khi hủy thanh toán: ", error);
        alert("Có lỗi xảy ra trong quá trình hủy thanh toán.");
        return false;
    }
}

/**
 * Thanh toán cho bàn đang được chọn.
 */
async function thanhToan() {
    const donHangHienTai = donHangCuaCacBan.get(banDuocChon);
    if (!donHangHienTai || donHangHienTai.chi_tiet_mon.length === 0) {
        alert("Bàn trống hoặc chưa chọn bàn, không có gì để thanh toán!");
        return;
    }

    let chiTietHoaDon = `--- HÓA ĐƠN BÀN ${donHangHienTai.ten_ban} ---\n\n`;
    donHangHienTai.chi_tiet_mon.forEach(mon => {
        chiTietHoaDon += `- ${mon.ten_mon} (SL: ${mon.so_luong}, ĐG: ${mon.don_gia.toLocaleString('vi-VN')}đ)\n`;
    });
    chiTietHoaDon += `\n-----------------------------------\n`;
    chiTietHoaDon += `TỔNG CỘNG: ${currencyFormatter.format(donHangHienTai.tong_tien)}`;

    if (confirm(chiTietHoaDon + "\n\nXác nhận thanh toán cho bàn này?")) {
        try {
            // *** LƯU LỊCH SỬ DOANH THU ***
            const hoaDonLuuTru = {
                ...donHangHienTai,
                ngay_thanh_toan: Timestamp.now() // Thêm ngày giờ thanh toán
            };
            await addDoc(collection(db, "restaurants", RESTAURANT_ID, "sales_history"), hoaDonLuuTru);

            // Xóa đơn hàng hiện tại
            const docRef = doc(db, "restaurants", RESTAURANT_ID, "current_orders", `ban_${banDuocChon}`);
            await deleteDoc(docRef);

            alert(`Đã thanh toán thành công cho bàn ${donHangHienTai.ten_ban}!`);
            
            // Reset giao diện
            banDuocChon = null;
            soBanHienTaiSpan.textContent = 'Chưa chọn bàn';
            formOrderWrapper.style.display = 'none';
            renderLuoiBanAn();

            // Gọi hàm callback để thông báo cho app.js biết cần làm mới báo cáo
            if (onSaleCompletedCallback) onSaleCompletedCallback();
        } catch (error) {
            console.error("Lỗi khi thanh toán: ", error);
        }
    }
}

// =================================================================
// --- KHỞI TẠO MODULE ---
// =================================================================

export function initBanHang(onSaleCompletedCallback) {
    // Vẽ lưới bàn ăn lần đầu tiên khi tải trang
    renderLuoiBanAn();

    // Lắng nghe sự thay đổi của TẤT CẢ các đơn hàng đang hoạt động
    const q = query(collection(db, "restaurants", RESTAURANT_ID, "current_orders"));
    onSnapshot(q, (querySnapshot) => {
        donHangCuaCacBan.clear(); // Xóa dữ liệu cũ
        querySnapshot.forEach((doc) => {
            // Lưu lại tất cả các bàn có khách vào Map
            donHangCuaCacBan.set(doc.data().ten_ban, doc.data());
        });
        renderLuoiBanAn(); // Cập nhật lại màu sắc các bàn
        if (banDuocChon) {
            renderChiTietDonHang(); // Cập nhật lại chi tiết nếu bàn đang chọn có thay đổi
        }
    });

    // Gắn sự kiện click cho toàn bộ lưới bàn ăn
    danhSachBanDiv.addEventListener('click', (e) => {
        // Sử dụng .closest() để đảm bảo luôn tìm thấy nút bàn dù click vào đâu bên trong nó
        const banDuocClick = e.target.closest('.table-item');
        if (banDuocClick) {
            const soBan = banDuocClick.dataset.soBan;
            chonBan(soBan); 
        }
    });

    // Gắn sự kiện để tự động điền giá khi chọn món
    if (inputTenMon) {
        inputTenMon.addEventListener('input', () => {
            const tenMonChon = inputTenMon.value;
            if (menuData.has(tenMonChon)) {
                const donGia = menuData.get(tenMonChon);
                inputDonGiaMon.value = donGia;
            }
        });
    }

    // Gắn các sự kiện khác
    formGoiMon.addEventListener('submit', themMon);
    bangChiTietMonBody.addEventListener('click', xoaMon);
    btnInHoaDon.addEventListener('click', inHoaDon);
    btnThanhToan.addEventListener('click', () => thanhToan(onSaleCompletedCallback));
}
