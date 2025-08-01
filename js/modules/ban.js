import { db, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from '../config/firebase.js';
import { RESTAURANT_ID } from '../config.js';

// --- Lấy các phần tử HTML ---
const formThemBan = document.getElementById('form-them-ban');
const inputTenBanMoi = document.getElementById('ten-ban-moi');
const bangQuanLyBanBody = document.querySelector('#bang-quan-ly-ban tbody');

// --- Biến trạng thái ---
// Export biến này để các module khác (như banHang.js) có thể truy cập
export let danhSachBanData = [];

/**
 * Thêm một bàn mới vào collection 'tables' của nhà hàng hiện tại trên Firestore.
 */
async function themBanMoi(e) {
    e.preventDefault();
    const tenBan = inputTenBanMoi.value.trim();

    if (!tenBan) {
        alert('Vui lòng nhập tên bàn.');
        return;
    }

    // Kiểm tra xem bàn đã tồn tại chưa để tránh trùng lặp
    if (danhSachBanData.includes(tenBan)) {
        alert(`Bàn "${tenBan}" đã tồn tại!`);
        return;
    }

    try {
        await addDoc(collection(db, 'restaurants', RESTAURANT_ID, 'tables'), {
            ten_ban: tenBan,
        });
        alert(`Đã thêm bàn "${tenBan}" thành công!`);
        formThemBan.reset();
    } catch (error) {
        console.error("Lỗi khi thêm bàn: ", error);
        alert('Có lỗi xảy ra, vui lòng thử lại.');
    }
}

/**
 * Xóa một bàn khỏi danh sách.
 */
async function xoaBan(e) {
    if (!e.target.classList.contains('btn-xoa-mon')) return;

    const banId = e.target.dataset.id;
    const tenBan = e.target.dataset.ten;
    if (confirm(`Bạn có chắc chắn muốn xóa bàn "${tenBan}" không?`)) {
        try {
            await deleteDoc(doc(db, 'restaurants', RESTAURANT_ID, 'tables', banId));
            alert('Đã xóa bàn thành công!');
        } catch (error) {
            console.error("Lỗi khi xóa bàn: ", error);
            alert('Có lỗi xảy ra, vui lòng thử lại.');
        }
    }
}

/**
 * Render lại bảng quản lý bàn.
 */
function renderBangQuanLyBan(snapshot) {
    if (bangQuanLyBanBody) {
        bangQuanLyBanBody.innerHTML = '';
    }
    danhSachBanData = snapshot.docs.map(doc => doc.data().ten_ban); // Cập nhật lại danh sách bàn

    snapshot.forEach(doc => {
        const ban = doc.data();
        const banId = doc.id;
        if (bangQuanLyBanBody) {
            const row = bangQuanLyBanBody.insertRow();
            row.innerHTML = `
                <td>${ban.ten_ban}</td>
                <td><button class="btn-xoa-mon" data-id="${banId}" data-ten="${ban.ten_ban}">Xóa</button></td>
            `;
        }
    });
}

export function initBan(onTablesChangeCallback) {
    const q = query(collection(db, 'restaurants', RESTAURANT_ID, 'tables'), orderBy('ten_ban'));
    onSnapshot(q, (snapshot) => {
        // 1. Render bảng quản lý bàn ở tab "Quản lý Bàn"
        renderBangQuanLyBan(snapshot);
        // 2. Gọi callback để render lại lưới bàn ở tab "Bán Hàng"
        if (onTablesChangeCallback) {
            onTablesChangeCallback();
        }
    });

    if (formThemBan) formThemBan.addEventListener('submit', themBanMoi);
    if (bangQuanLyBanBody) bangQuanLyBanBody.addEventListener('click', xoaBan);
}