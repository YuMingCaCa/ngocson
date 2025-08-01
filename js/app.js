import { RESTAURANT_NAME } from './config.js';
import { initNhapHang } from './modules/nhapHang.js';
import { initBanHang } from './modules/banHang.js';
import { initMenu } from './modules/menu.js';
import { initBaoCao } from './modules/baoCao.js';
import { initBan } from './modules/ban.js';

// Hàm này sẽ chạy khi toàn bộ trang web đã được tải xong
document.addEventListener('DOMContentLoaded', () => { 
    console.log("Ứng dụng đã sẵn sàng!");

    // Cập nhật tiêu đề trang và tiêu đề chính từ config
    updatePageTitles();
    
    // Khởi tạo chức năng chuyển đổi tab
    initTabs();

    // Khởi tạo các module quản lý dữ liệu nền (phải chạy trước các module chức năng)
    initMenu();
    initBan();

    // Khởi tạo các module chức năng chính
    // Khởi tạo module Nhập Hàng
    initNhapHang();
    
    // Khởi tạo module Bán Hàng
    initBanHang();

    // Khởi tạo module Báo Cáo
    initBaoCao();
});

function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;

            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Cập nhật các tiêu đề của trang web dựa trên tên nhà hàng trong config.
 */
function updatePageTitles() {
    document.title = `Quản lý - ${RESTAURANT_NAME}`;
    const mainTitleElement = document.getElementById('main-title');
    if (mainTitleElement) {
        mainTitleElement.textContent = `Quản lý - ${RESTAURANT_NAME}`;
    }
}
