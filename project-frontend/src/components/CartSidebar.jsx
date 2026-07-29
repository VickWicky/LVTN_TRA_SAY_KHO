import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils';

export default function CartSidebar({ isOpen, onClose }) {
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {/* LỚP MÀN ĐEN (Backdrop) */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-[998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      ></div>

      {/* KHUNG GIỎ HÀNG (Sidebar) */}
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] max-w-[100vw] bg-white shadow-2xl z-[999] flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Giỏ hàng */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-dark">Giỏ Hàng</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-accent text-2xl transition cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Danh sách sản phẩm (Có thanh cuộn nếu quá dài) */}
        <div className="flex-1 overflow-y-auto p-5">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-light">
              <i className="fas fa-shopping-basket text-5xl text-gray-200 mb-4"></i>
              <p>Giỏ hàng của bạn đang trống</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map((item) => {
                const { product, variant, quantity } = item;
                const price = variant.sale_price && variant.sale_price > 0 ? variant.sale_price : variant.price;
                
                return (
                  <div key={variant.id} className="flex gap-4 border-b border-gray-50 pb-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      <img src={getImageUrl(product.thumbnail)} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-dark text-sm line-clamp-2">
                          {product.name} (Gói {variant.weight}g)
                        </h3>
                        <p className="text-primary font-bold text-sm mt-1">{Number(price).toLocaleString('vi-VN')}₫</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        {/* Nút tăng giảm */}
                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden h-8">
                          <button 
                            onClick={() => updateQuantity(variant.id, quantity - 1)}
                            className="w-8 h-full bg-bglight hover:bg-primary-light hover:text-white transition flex items-center justify-center text-dark cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                          <button 
                            onClick={() => updateQuantity(variant.id, quantity + 1)}
                            className="w-8 h-full bg-bglight hover:bg-primary-light hover:text-white transition flex items-center justify-center text-dark cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        
                        {/* Nút xóa */}
                        <button 
                          onClick={() => removeFromCart(variant.id)}
                          className="w-8 h-8 rounded-md bg-red-50 text-accent hover:bg-accent hover:text-white transition flex items-center justify-center cursor-pointer"
                        >
                          <i className="fas fa-trash-alt text-sm"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (Tổng tiền & Thanh toán) */}
        <div className="border-t border-gray-100 p-5 bg-bglight">
          <div className="flex justify-between items-center mb-4 text-lg font-bold text-dark">
            <span>Tổng cộng:</span>
            <span className="text-primary">{cartTotal.toLocaleString('vi-VN')}₫</span>
          </div>
          <button 
            onClick={() => { 
              onClose(); 
              navigate(cartItems.length === 0 ? '/products' : '/checkout'); 
            }}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition shadow-md cursor-pointer"
          >
            {cartItems.length === 0 ? 'Tiếp Tục Mua Sắm' : 'Thanh Toán'}
          </button>
        </div>
      </div>
    </>
  );
}