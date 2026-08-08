import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils";
import { useWishlist } from "../contexts/WishlistContext";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();

  let minPrice = 0;
  let maxPrice = 0;
  let isDiscounted = false;
  let maxDiscountPercent = 0;

  if (product.variants && product.variants.length > 0) {
    const currentPrices = product.variants.map((v) => {
      if (v.sale_price && v.sale_price > 0 && v.sale_price < v.price) {
        const discountPercent = Math.round(
          (1 - v.sale_price / v.price) * 100
        );
        if (discountPercent > maxDiscountPercent)
          maxDiscountPercent = discountPercent;
        isDiscounted = true;
        return v.sale_price;
      }
      return v.price;
    });
    minPrice = Math.min(...currentPrices);
    maxPrice = Math.max(...currentPrices);
  } else if (product.minPrice !== undefined) {
      // Allow passing pre-calculated prices if already calculated
      minPrice = product.minPrice;
      maxPrice = product.maxPrice;
      isDiscounted = product.isDiscounted;
      maxDiscountPercent = product.maxDiscountPercent;
  }

  return (
    <article
      onClick={() => navigate(`/product/${product.id}`)}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition transform hover:-translate-y-2 cursor-pointer group flex flex-col h-full"
    >
      <div className="relative h-64 overflow-hidden bg-bglight flex items-center justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-4 right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center transition shadow-sm bg-white/90 hover:bg-red-50 hover:scale-110 ${
            isInWishlist(product.id)
              ? "text-red-500"
              : "text-gray-400 hover:text-red-500"
          }`}
          title={
            isInWishlist(product.id)
              ? "Xóa khỏi danh sách yêu thích"
              : "Thêm vào danh sách yêu thích"
          }
        >
          <i
            className={`${isInWishlist(product.id) ? "fas" : "far"} fa-heart text-lg`}
          ></i>
        </button>

        <img
          src={getImageUrl(product.thumbnail)}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
        />
        {isDiscounted && (
          <span className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-full shadow-md">
            Giảm đến {maxDiscountPercent}%
          </span>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition line-clamp-1">
          {product.name}
        </h3>
        <p className="text-sm text-light mb-4 line-clamp-2 flex-1">
          {product.description}
        </p>

        <div className="mt-auto border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wider">
            Khoảng giá
          </p>
          <p className="text-lg font-bold text-primary">
            {minPrice === maxPrice || maxPrice === 0
              ? `${Number(minPrice).toLocaleString("vi-VN")}₫`
              : `${Number(minPrice).toLocaleString("vi-VN")}₫ - ${Number(maxPrice).toLocaleString("vi-VN")}₫`}
          </p>
        </div>
      </div>
    </article>
  );
}
