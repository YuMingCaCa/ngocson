import { RESTAURANT_NAME } from './config.js';
import { initNhapHang } from './modules/nhapHang.js';
import { initBanHang, renderLuoiBanAn, huyThanhToan, generateAndPrintInvoice } from './modules/banHang.js';
import { initMenu } from './modules/menu.js';
import { initBaoCao, loadBaoCaoData, hienThiBaoCaoTongQuan, hienThiBaoCaoNgay, hienThiBieuDoLoiNhuan } from './modules/baoCao.js';
import { initBan } from './modules/ban.js';

// Hàm này sẽ chạy khi toàn bộ trang web đã được tải xong
document.addEventListener('DOMContentLoaded', () => { 
    console.log("Ứng dụng đã sẵn sàng!");

    // --- ĐỊNH NGHĨA CÁC HÀM CẬP NHẬT CHUNG ---
    // Hàm này sẽ được gọi mỗi khi có dữ liệu thay đổi (bán hàng, nhập hàng)
    const refreshAllReports = () => {
        hienThiBaoCaoTongQuan();
        hienThiBaoCaoNgay();
        hienThiBieuDoLoiNhuan();
    };

    // Cập nhật tiêu đề trang và tiêu đề chính từ config
    updatePageTitles();
    
    // Khởi tạo chức năng chuyển đổi tab
    initTabs();

    // Khởi tạo các module quản lý dữ liệu nền (phải chạy trước các module chức năng)
    initMenu();
    // Truyền hàm render lưới bàn vào module `ban` để nó có thể gọi lại khi có thay đổi
    initBan(renderLuoiBanAn);

    // Khởi tạo các module chức năng chính
    // Truyền hàm cập nhật báo cáo vào module Nhập Hàng
    initNhapHang(refreshAllReports);
    
    // Truyền hàm cập nhật báo cáo vào module Bán Hàng
    initBanHang(refreshAllReports);

    // Truyền các hàm cần thiết vào module Báo Cáo
    initBaoCao({ onCancelInvoice: huyThanhToan, onPrintInvoice: generateAndPrintInvoice });
});

function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    let isBaoCaoLoaded = false; // Cờ để kiểm tra xem tab báo cáo đã tải dữ liệu chưa

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;

            // Nếu nhấn vào tab báo cáo và dữ liệu chưa được tải, thì tải nó
            if (tabId === 'tab-bao-cao' && !isBaoCaoLoaded) {
                loadBaoCaoData();
                isBaoCaoLoaded = true; // Đánh dấu đã tải để không tải lại
            }

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
    const title = `Quản lý - ${RESTAURANT_NAME}`;
    document.title = title;
    const mainTitleElement = document.getElementById('main-title');
    if (mainTitleElement) {
        mainTitleElement.textContent = title;
    }
}
