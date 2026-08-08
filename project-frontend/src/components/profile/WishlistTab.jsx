import { Link } from "react-router-dom";
import { useWishlist } from "../../contexts/WishlistContext";
import { getImageUrl } from "../../utils";

export default function WishlistTab() {
  const { wishlistItems, removeFromWishlist } = useWishlist();

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in">
      <h2 className="text-2xl font-bold text-dark mb-6 border-b pb-4">
        Danh Sách Yêu Thích
      </h2>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-10 bg-bglight rounded-xl">
          <i className="fas fa-heart-broken text-5xl text-gray-300 mb-3"></i>
          <p className="text-gray-500 mb-4">
            Bạn chưa có sản phẩm nào trong danh sách yêu thích.
          </p>
          <Link
            to="/products"
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg font-semibold transition"
          >
            Khám Phá Sản Phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {wishlistItems.map((product) => {
            let minPrice = 0;
            let maxPrice = 0;

            if (product.variants && product.variants.length > 0) {
              const currentPrices = product.variants.map((v) => {
                if (
                  v.sale_price &&
                  v.sale_price > 0 &&
                  v.sale_price < v.price
                ) {
                  return v.sale_price;
                }
                return v.price;
              });
              minPrice = Math.min(...currentPrices);
              maxPrice = Math.max(...currentPrices);
            }

            return (
              <article
                key={product.id}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition relative flex flex-col h-full"
              >
                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center text-red-500 transition shadow-sm cursor-pointer"
                  title="Xóa khỏi danh sách yêu thích"
                >
                  <i className="fas fa-times"></i>
                </button>

                <Link
                  to={`/product/${product.id}`}
                  className="block relative h-48 overflow-hidden bg-bglight flex items-center justify-center group"
                >
                  <img
                    src={getImageUrl(product.thumbnail)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </Link>

                <div className="p-4 flex flex-col flex-1">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-md font-bold mb-1 hover:text-primary transition line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-auto border-t border-gray-50 pt-2">
                    <span className="text-md font-bold text-primary">
                      {minPrice === maxPrice || maxPrice === 0
                        ? `${Number(minPrice).toLocaleString("vi-VN")}₫`
                        : `${Number(minPrice).toLocaleString("vi-VN")}₫ - ${Number(maxPrice).toLocaleString("vi-VN")}₫`}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
