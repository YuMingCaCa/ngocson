// --- Định dạng tiền tệ ---
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
});

export { currencyFormatter };