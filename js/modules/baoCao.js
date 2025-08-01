import { db, collection, query, where, getDocs, Timestamp, orderBy, doc, updateDoc, deleteDoc } from '../config/firebase.js';
import { RESTAURANT_ID } from '../config.js';
import { currencyFormatter } from '../utils/formatters.js';

// --- Lấy các phần tử HTML ---
const inputChonThangBaoCao = document.getElementById('chon-thang-bao-cao');
const btnXemBaoCaoThang = document.getElementById('btn-xem-bao-cao-tong-quan');
const statDoanhThu = document.getElementById('stat-doanh-thu');
const statChiPhi = document.getElementById('stat-chi-phi');
const statLoiNhuan = document.getElementById('stat-loi-nhuan');
const bangChiTietDoanhThu = document.getElementById('bang-chi-tiet-doanh-thu');
const bangChiTietChiPhi = document.getElementById('bang-chi-tiet-chi-phi');
const profitChartCanvas = document.getElementById('profit-chart');

// Báo cáo theo ngày
const inputChonNgayBaoCao = document.getElementById('chon-ngay-bao-cao');
const btnXemBaoCaoNgay = document.getElementById('btn-xem-bao-cao-ngay');
const statDoanhThuNgay = document.getElementById('stat-doanh-thu-ngay');
const statChiPhiNgay = document.getElementById('stat-chi-phi-ngay');
const statLoiNhuanNgay = document.getElementById('stat-loi-nhuan-ngay');

// Tìm kiếm hóa đơn
const searchByTableInput = document.getElementById('search-by-table');
const searchByDateInput = document.getElementById('search-by-date');
const btnClearSearch = document.getElementById('btn-clear-search');

// --- Biến trạng thái ---
let profitChartInstance = null;
let currentMonthSalesDocs = []; // Lưu hóa đơn của tháng đang xem để lọc

/**
 * Hàm trợ giúp để lấy tổng tiền từ một collection trong một khoảng thời gian.
 * @param {Array<string>} collectionPath Mảng các segment của đường dẫn collection.
 * @param {string} dateField Tên trường chứa dữ liệu ngày tháng (Timestamp).
 * @param {string} amountField Tên trường chứa dữ liệu số tiền.
 * @param {Date} startDate Ngày bắt đầu.
 * @param {Date} endDate Ngày kết thúc.
 * @returns {Promise<number>} Tổng số tiền.
 */
async function getTotalAmountInRange(collectionPath, dateField, amountField, startDate, endDate) {
    const q = query(
        collection(db, ...collectionPath),
        where(dateField, '>=', startDate),
        where(dateField, '<', endDate)
    );
    const querySnapshot = await getDocs(q);
    let total = 0;
    querySnapshot.forEach(doc => {
        total += doc.data()[amountField];
    });
    return total;
}

/**
 * Render bảng chi tiết doanh thu từ một danh sách các document.
 * @param {Array} docsToRender - Mảng các document hóa đơn cần hiển thị.
 */
function renderSalesDetailTable(docsToRender) {
    const tableBody = bangChiTietDoanhThu.querySelector('tbody');
    if (!tableBody) return; // Đảm bảo tbody tồn tại

    tableBody.innerHTML = docsToRender.map(doc => {
        const data = doc.data();
        return `
            <tr>
                <td>${data.ngay_thanh_toan.toDate().toLocaleString('vi-VN')}</td>
                <td>${data.ten_ban}</td>
                <td>${currencyFormatter.format(data.tong_tien)}</td>
                <td>
                    <button class="btn-in-lai" data-id="${doc.id}">In Lại</button>
                    <button class="btn-huy" data-id="${doc.id}">Hủy</button>
                </td>
            </tr>
        `;
    }).join('');

    if (docsToRender.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Không tìm thấy hóa đơn nào.</td></tr>`;
    }
}

/**
 * Hiển thị báo cáo tổng quan (doanh thu, chi phí, lợi nhuận) cho tháng được chọn.
 */
export async function hienThiBaoCaoTongQuan() {
    const [year, month] = inputChonThangBaoCao.value.split('-').map(Number);
    if (!year || !month) return;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Lấy dữ liệu
    const [totalRevenue, totalCost, salesDetails, costDetails] = await Promise.all([
        getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'sales_history'], 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
        getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'purchase_history'], 'ngay_nhap', 'thanh_tien', startDate, endDate),
        getDocs(query(collection(db, 'restaurants', RESTAURANT_ID, 'sales_history'), where('ngay_thanh_toan', '>=', startDate), where('ngay_thanh_toan', '<', endDate), orderBy('ngay_thanh_toan', 'desc'))),
        getDocs(query(collection(db, 'restaurants', RESTAURANT_ID, 'purchase_history'), where('ngay_nhap', '>=', startDate), where('ngay_nhap', '<', endDate), orderBy('ngay_nhap', 'desc')))
    ]);

    const profit = totalRevenue - totalCost;

    // Cập nhật các ô thống kê
    statDoanhThu.textContent = currencyFormatter.format(totalRevenue);
    statChiPhi.textContent = currencyFormatter.format(totalCost);
    statLoiNhuan.textContent = currencyFormatter.format(profit);

    // Lưu lại và hiển thị bảng chi tiết doanh thu
    currentMonthSalesDocs = salesDetails.docs;
    renderSalesDetailTable(currentMonthSalesDocs);

    // Hiển thị bảng chi tiết chi phí
    const costTableBody = bangChiTietChiPhi.querySelector('tbody');
    if (!costTableBody) return; // Đảm bảo tbody tồn tại

    costTableBody.innerHTML = costDetails.docs.map(doc => {
        const data = doc.data();
        return `
            <tr>
                <td>${data.ngay_nhap.toDate().toLocaleDateString('vi-VN')}</td>
                <td>${data.ten_san_pham}</td>
                <td>${data.so_luong}</td>
                <td>${data.don_vi_tinh}</td>
                <td>${currencyFormatter.format(data.don_gia)}</td>
                <td>${currencyFormatter.format(data.thanh_tien)}</td>
                <td>
                    <button class="btn-sua-mon" data-id="${doc.id}" data-soluong="${data.so_luong}" data-dongia="${data.don_gia}">Sửa</button>
                    <button class="btn-huy" data-id="${doc.id}">Xóa</button>
                </td>
            </tr>
        `;
    }).join('');

    if (costDetails.empty) {
        costTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Không có chi phí nào trong tháng này.</td></tr>`;
    }
}

/**
 * Lọc và hiển thị lại bảng chi tiết doanh thu dựa trên các ô tìm kiếm.
 */
function filterAndRenderSales() {
    const searchTerm = searchByTableInput.value.toLowerCase().trim();
    const searchDate = searchByDateInput.value;

    let filteredDocs = currentMonthSalesDocs;

    // Lọc theo tên bàn
    if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc =>
            doc.data().ten_ban.toLowerCase().includes(searchTerm)
        );
    }

    // Lọc theo ngày
    if (searchDate) {
        filteredDocs = filteredDocs.filter(doc => {
            const docDate = doc.data().ngay_thanh_toan.toDate();
            // So sánh chuỗi YYYY-MM-DD
            return docDate.toISOString().slice(0, 10) === searchDate;
        });
    }

    renderSalesDetailTable(filteredDocs);
}

/**
 * Sửa một khoản chi phí nhập kho.
 */
async function suaChiPhi(e) {
    if (!e.target.classList.contains('btn-sua-mon')) return;

    const id = e.target.dataset.id;
    const soLuongCu = e.target.dataset.soluong;
    const donGiaCu = e.target.dataset.dongia;

    const soLuongMoiStr = prompt("Nhập số lượng mới:", soLuongCu);
    if (soLuongMoiStr === null) return;

    const donGiaMoiStr = prompt("Nhập đơn giá mới:", donGiaCu);
    if (donGiaMoiStr === null) return;

    const soLuongMoi = parseFloat(soLuongMoiStr);
    const donGiaMoi = parseFloat(donGiaMoiStr);

    if (isNaN(soLuongMoi) || isNaN(donGiaMoi) || soLuongMoi < 0 || donGiaMoi < 0) {
        alert("Vui lòng nhập số lượng và đơn giá hợp lệ.");
        return;
    }

    const thanhTienMoi = soLuongMoi * donGiaMoi;
    const chiPhiRef = doc(db, "restaurants", RESTAURANT_ID, "purchase_history", id);

    try {
        await updateDoc(chiPhiRef, {
            so_luong: soLuongMoi,
            don_gia: donGiaMoi,
            thanh_tien: thanhTienMoi
        });
        alert("Cập nhật chi phí thành công!");
        hienThiBaoCaoTongQuan(); // Tải lại dữ liệu báo cáo để thấy thay đổi
    } catch (error) {
        console.error("Lỗi khi cập nhật chi phí: ", error);
        alert("Có lỗi xảy ra khi cập nhật chi phí.");
    }
}

/**
 * Xóa một khoản chi phí nhập kho.
 */
async function xoaChiPhi(e) {
    if (!e.target.classList.contains('btn-huy')) return;

    const id = e.target.dataset.id;    
    if (confirm("Bạn có chắc chắn muốn xóa khoản chi phí này không? Thao tác này không thể hoàn tác.")) {
        const chiPhiRef = doc(db, "restaurants", RESTAURANT_ID, "purchase_history", id);
        try {
            await deleteDoc(chiPhiRef);
            alert("Xóa chi phí thành công!");
            hienThiBaoCaoTongQuan(); // Tải lại dữ liệu báo cáo để thấy thay đổi
        } catch (error) {
            console.error("Lỗi khi xóa chi phí: ", error);
            alert("Có lỗi xảy ra khi xóa chi phí.");
        }
    }
}

/**
 * Hiển thị báo cáo (doanh thu, chi phí, lợi nhuận) cho ngày được chọn.
 */
export async function hienThiBaoCaoNgay() {
    const selectedDateValue = inputChonNgayBaoCao.value;
    if (!selectedDateValue) return;

    // Đặt múi giờ để tính toán ngày chính xác
    const startDate = new Date(selectedDateValue + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    // Lấy dữ liệu
    const [dailyRevenue, dailyCost] = await Promise.all([
        getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'sales_history'], 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
        getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'purchase_history'], 'ngay_nhap', 'thanh_tien', startDate, endDate)
    ]);

    const dailyProfit = dailyRevenue - dailyCost;

    // Cập nhật các ô thống kê
    statDoanhThuNgay.textContent = currencyFormatter.format(dailyRevenue);
    statChiPhiNgay.textContent = currencyFormatter.format(dailyCost);
    statLoiNhuanNgay.textContent = currencyFormatter.format(dailyProfit);
}

/**
 * Lấy dữ liệu và vẽ biểu đồ lợi nhuận 6 tháng gần nhất.
 */
export async function hienThiBieuDoLoiNhuan() {
    const labels = [];
    const profitData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        const [monthlyRevenue, monthlyCost] = await Promise.all([
            getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'sales_history'], 'ngay_thanh_toan', 'tong_tien', startDate, endDate),
            getTotalAmountInRange(['restaurants', RESTAURANT_ID, 'purchase_history'], 'ngay_nhap', 'thanh_tien', startDate, endDate)
        ]);

        labels.push(`T${month + 1}/${year}`);
        profitData.push(monthlyRevenue - monthlyCost);
    }

    // Hủy biểu đồ cũ nếu tồn tại để vẽ lại
    if (profitChartInstance) {
        profitChartInstance.destroy();
    }

    // Vẽ biểu đồ mới
    const ctx = profitChartCanvas.getContext('2d');
    profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Lợi Nhuận (VND)',
                data: profitData,
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('vi-VN') + 'đ';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += currencyFormatter.format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Đặt tháng báo cáo mặc định là tháng hiện tại.
 */
function setInitialReportMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    inputChonThangBaoCao.value = `${year}-${month}`;
}

/**
 * Đặt ngày báo cáo mặc định là ngày hôm nay.
 */
function setInitialReportDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    inputChonNgayBaoCao.value = `${year}-${month}-${day}`;
}

/**
 * Tải tất cả dữ liệu cần thiết cho tab báo cáo.
 * Hàm này chỉ nên được gọi một lần khi người dùng mở tab.
 */
export function loadBaoCaoData() {
    hienThiBaoCaoTongQuan();
    hienThiBaoCaoNgay();
    hienThiBieuDoLoiNhuan();
}

/**
 * Hàm khởi tạo cho module báo cáo.
 */
export function initBaoCao({ onCancelInvoice, onPrintInvoice }) {
    setInitialReportMonth();
    setInitialReportDate();

    // Gắn sự kiện cho các nút xem báo cáo và bộ lọc
    btnXemBaoCaoThang.addEventListener('click', hienThiBaoCaoTongQuan);
    btnXemBaoCaoNgay.addEventListener('click', hienThiBaoCaoNgay);
    searchByTableInput.addEventListener('input', filterAndRenderSales);
    searchByDateInput.addEventListener('input', filterAndRenderSales);

    if (bangChiTietChiPhi) {
        bangChiTietChiPhi.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-sua-mon')) suaChiPhi(e);
            if (e.target.classList.contains('btn-huy')) xoaChiPhi(e);
        });
    }

    if (bangChiTietDoanhThu) bangChiTietDoanhThu.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-in-lai')) {
            const docId = e.target.dataset.id;
            const hoaDonDoc = currentMonthSalesDocs.find(doc => doc.id === docId);
            if (hoaDonDoc) {
                if (onPrintInvoice) onPrintInvoice(hoaDonDoc.data());
            }
        }
        if (e.target.classList.contains('btn-huy')) {
            const docId = e.target.dataset.id;
            const hoaDonDoc = currentMonthSalesDocs.find(doc => doc.id === docId);
            if (hoaDonDoc) {
                const hoaDonData = hoaDonDoc.data();
                if (confirm(`Bạn có chắc chắn muốn HỦY hóa đơn cho bàn "${hoaDonData.ten_ban}" không?\n\nHành động này sẽ mở lại bàn và xóa hóa đơn khỏi lịch sử.`)) {
                    if (onCancelInvoice) onCancelInvoice(docId, hoaDonData).then(success => {
                        // Nếu hủy thành công, tải lại báo cáo để cập nhật
                        if (success) hienThiBaoCaoTongQuan();
                    });
                }
            }
        }
    });

    if (btnClearSearch) btnClearSearch.addEventListener('click', () => {
        searchByTableInput.value = '';
        searchByDateInput.value = '';
        filterAndRenderSales();
    });
}
