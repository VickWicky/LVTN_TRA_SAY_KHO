export const getImageUrl = (path) => {
  if (!path) return '/img/placeholder.jpg';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/storage/')) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    return `${API_URL}${path}`;
  }
  return path;
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};
