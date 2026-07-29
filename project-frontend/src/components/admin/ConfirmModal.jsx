export default function ConfirmModal({ isOpen, onClose, onConfirm, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-scale-up border border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex-shrink-0 flex items-center justify-center text-red-500">
            <i className="fas fa-exclamation-triangle text-xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Xác nhận</h3>
        </div>
        <p className="text-gray-600 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition shadow-md shadow-red-500/20"
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
