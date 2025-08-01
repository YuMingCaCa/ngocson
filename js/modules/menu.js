import { db, collection, addDoc, onSnapshot, doc, deleteDoc, orderBy, query, updateDoc } from '../config/firebase.js';
import { RESTAURANT_ID } from '../config.js';
import { currencyFormatter } from '../utils/formatters.js';

// --- Lấy các phần tử HTML ---
const formThemMonMenu = document.getElementById('form-them-mon-menu');
const inputTenMonMenu = document.getElementById('ten-mon-menu');
const inputGiaMonMenu = document.getElementById('gia-mon-menu');
const bangQuanLyMenuBody = document.querySelector('#bang-quan-ly-menu tbody');
const datalistMonAn = document.getElementById('danh-sach-mon-an');

// --- Biến trạng thái ---
// Dùng Map để truy cập giá món ăn nhanh hơn qua tên món
export const menuData = new Map();

/**
 * Thêm một món mới vào collection 'menu' của nhà hàng hiện tại trên Firestore.
 */
async function themMonVaoMenu(e) {
    e.preventDefault();
    const tenMon = inputTenMonMenu.value.trim();
    const donGia = parseFloat(inputGiaMonMenu.value);

    if (!tenMon || isNaN(donGia)) {
        alert('Vui lòng nhập đầy đủ tên món và đơn giá hợp lệ.');
        return;
    }

    try {
        await addDoc(collection(db, 'restaurants', RESTAURANT_ID, 'menu'), {
            ten_mon: tenMon,
            don_gia: donGia
        });
        alert(`Đã thêm món "${tenMon}" vào menu thành công!`);
        formThemMonMenu.reset();
    } catch (error) {
        console.error("Lỗi khi thêm món vào menu: ", error);
        alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
}

/**
 * Xóa một món khỏi menu.
 */
async function xoaMonKhoiMenu(e) {
    // Chỉ hoạt động khi click vào nút có class 'btn-xoa-mon'
    if (!e.target.classList.contains('btn-xoa-mon')) return;

    const monId = e.target.dataset.id;
    const tenMon = e.target.dataset.ten;
    if (confirm(`Bạn có chắc chắn muốn xóa món "${tenMon}" khỏi menu không?`)) {
        try {
            await deleteDoc(doc(db, 'restaurants', RESTAURANT_ID, 'menu', monId));
            alert('Đã xóa món thành công!');
        } catch (error) {
            console.error("Lỗi khi xóa món: ", error);
            alert('Có lỗi xảy ra, vui lòng thử lại.');
        }
    }
}

/**
 * Sửa giá của một món ăn trong menu.
 */
async function suaGiaMon(e) {
    // Chỉ hoạt động khi click vào nút có class 'btn-sua-mon'
    if (!e.target.classList.contains('btn-sua-mon')) return;

    const monId = e.target.dataset.id;
    const tenMon = e.target.dataset.ten;
    const giaCu = e.target.dataset.gia;

    const giaMoiStr = prompt(`Nhập giá mới cho món "${tenMon}":`, giaCu);

    // Nếu người dùng nhấn "Cancel"
    if (giaMoiStr === null) {
        return;
    }

    const giaMoi = parseFloat(giaMoiStr);

    if (isNaN(giaMoi) || giaMoi < 0) {
        alert('Vui lòng nhập một mức giá hợp lệ.');
        return;
    }

    try {
        const monRef = doc(db, 'restaurants', RESTAURANT_ID, 'menu', monId);
        await updateDoc(monRef, { don_gia: giaMoi });
        alert('Cập nhật giá thành công!');
    } catch (error) {
        console.error("Lỗi khi cập nhật giá: ", error);
        alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
}

/**
 * Render lại bảng quản lý menu và datalist gợi ý.
 */
function renderMenu(snapshot) {
    bangQuanLyMenuBody.innerHTML = '';
    datalistMonAn.innerHTML = '';
    menuData.clear(); // Xóa dữ liệu cũ

    snapshot.forEach(doc => {
        const mon = doc.data();
        const monId = doc.id;

        // Cập nhật Map dữ liệu menu để các module khác có thể dùng
        menuData.set(mon.ten_mon, mon.don_gia);

        // Render dòng trong bảng quản lý
        const row = bangQuanLyMenuBody.insertRow();
        row.innerHTML = `
            <td>${mon.ten_mon}</td>
            <td>${currencyFormatter.format(mon.don_gia)}</td>
            <td>
                <button class="btn-sua-mon" data-id="${monId}" data-ten="${mon.ten_mon}" data-gia="${mon.don_gia}">Sửa</button>
                <button class="btn-xoa-mon" data-id="${monId}" data-ten="${mon.ten_mon}">Xóa</button>
            </td>
        `;

        // Render option cho datalist gợi ý ở tab Bán Hàng
        const option = document.createElement('option');
        option.value = mon.ten_mon;
        datalistMonAn.appendChild(option);
    });
}

/**
 * Hàm khởi tạo cho module quản lý menu.
 */
export function initMenu() {
    // Lắng nghe sự thay đổi real-time của menu, sắp xếp theo tên
    const q = query(collection(db, 'restaurants', RESTAURANT_ID, 'menu'), orderBy('ten_mon'));
    onSnapshot(q, (snapshot) => {
        renderMenu(snapshot);
    });

    // Gắn sự kiện cho form và bảng
    if (formThemMonMenu) formThemMonMenu.addEventListener('submit', themMonVaoMenu);
    if (bangQuanLyMenuBody) {
        bangQuanLyMenuBody.addEventListener('click', (e) => {
            xoaMonKhoiMenu(e);
            suaGiaMon(e);
        });
    }
}
