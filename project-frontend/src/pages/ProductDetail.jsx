import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useWishlist } from "../contexts/WishlistContext";
import { getImageUrl } from "../utils";
import ProductCard from "../components/ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(true);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);

          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          }
        } else {
          navigate("/products");
        }
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
      } finally {
        setIsLoading(false);
      }

      try {
        setIsRelatedLoading(true);
        const relatedRes = await fetch(`${API_URL}/api/products/${id}/related`);
        if (relatedRes.ok) {
          const relatedData = await relatedRes.json();
          setRelatedProducts(relatedData);
        }
      } catch (error) {
        console.error("Lỗi khi lấy sản phẩm liên quan:", error);
      } finally {
        setIsRelatedLoading(false);
      }
    };

    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchProductDetail();
  }, [id, navigate]);

  useEffect(() => {
    if (selectedVariant) {
      setQuantity(1);
    }
  }, [selectedVariant]);

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };
  const handleIncrease = () => {
    const availableStock = selectedVariant?.batches_sum_stock || 0;
    if (quantity < availableStock) {
      setQuantity(quantity + 1);
    } else {
      toast.warning(`Chỉ còn ${availableStock} sản phẩm!`);
    }
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return toast.error("Sản phẩm đang cập nhật giá!");
    addToCart(product, selectedVariant, quantity);
    const priceToUse = selectedVariant.sale_price || selectedVariant.price;
    toast.success(
      `Đã thêm ${quantity} hộp ${product.name} (Gói ${selectedVariant.weight}g) vào giỏ hàng!\nTổng tiền: ${(priceToUse * quantity).toLocaleString("vi-VN")}₫`,
    );
  };

  if (isLoading || !product) {
    return (
      <div className="text-center py-20 font-semibold text-primary text-xl">
        Đang hái trà...
      </div>
    );
  }

  const metaText = `Gói ${selectedVariant ? selectedVariant.weight : 100}g — Bảo quản: nơi khô ráo, tránh ánh nắng trực tiếp`;

  const defaultFeatures = [
    `Loại trà: ${product.name}`,
    `Trọng lượng: ${selectedVariant ? selectedVariant.weight : 100}g`,
    "Thành phần: 100% lá trà thiên nhiên",
  ];

  const defaultBrewList = [
    "Đun nước sôi đến 75-85°C",
    "Cho lá trà 2-3g vào tách",
    "Ngâm 3-5 phút rồi thưởng thức",
  ];

  return (
    <div className="container mx-auto px-4 max-w-7xl py-12">
      {/* Nút về trang sản phẩm */}
      <div className="mb-6">
        <Link
          to="/products"
          className="text-light hover:text-primary transition flex items-center gap-2 font-semibold"
        >
          <i className="fas fa-arrow-left"></i> Quay lại cửa hàng
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Ảnh sản phẩm */}
        <div className="sticky top-24">
          <div className="rounded-xl overflow-hidden shadow-lg bg-bglight group relative flex justify-center items-center h-[500px]">
            <img
              src={getImageUrl(product.thumbnail)}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
            />
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <div>
          <h1 className="text-3xl font-bold text-dark mb-2">{product.name}</h1>
          <p className="text-light text-sm mb-4">{metaText}</p>

          {/* HIỂN THỊ GIÁ */}
          <div className="flex items-end gap-4 mb-6">
            <p className="text-4xl font-bold text-primary">
              {selectedVariant
                ? Number(
                    selectedVariant.sale_price || selectedVariant.price,
                  ).toLocaleString("vi-VN")
                : 0}
              ₫
            </p>
            {selectedVariant && selectedVariant.sale_price && (
              <p className="text-2xl font-medium text-gray-400 line-through pb-1">
                {Number(selectedVariant.price).toLocaleString("vi-VN")}₫
              </p>
            )}
            {selectedVariant && selectedVariant.sale_price && (
              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-bold mb-1">
                Tiết kiệm{" "}
                {Number(
                  selectedVariant.price - selectedVariant.sale_price,
                ).toLocaleString("vi-VN")}
                ₫
              </span>
            )}
          </div>

          {/* KHU VỰC CHỌN GÓI TRÀ */}
          <div className="mb-8">
            <label className="text-sm font-semibold mb-3 text-dark flex items-center gap-2">
              Chọn Khối Lượng
              {selectedVariant && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${selectedVariant.batches_sum_stock > 0 ? "text-green-700" : "text-red-600"}`}
                >
                  {selectedVariant.batches_sum_stock > 0
                    ? `Còn lại: ${selectedVariant.batches_sum_stock}`
                    : "Hết hàng"}
                </span>
              )}
            </label>
            <div className="flex gap-3">
              {product.variants &&
                product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 border-2 rounded-lg font-bold transition ${
                      selectedVariant?.id === variant.id
                        ? "border-primary bg-primary-light text-white"
                        : "border-gray-200 text-gray-500 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {variant.weight}g
                  </button>
                ))}
            </div>
          </div>

          {/* Tùy chọn Số lượng & Thêm giỏ hàng */}
          <div className="flex flex-col sm:flex-row gap-4 mb-10 items-end">
            <div className="flex flex-col w-full sm:w-auto">
              <label className="text-sm font-semibold mb-2 text-dark">
                Số Lượng:
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-12">
                <button
                  onClick={handleDecrease}
                  className="w-12 h-full bg-bglight hover:bg-primary-light hover:text-white transition flex items-center justify-center text-xl cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  readOnly
                  className="w-16 h-full text-center border-none focus:outline-none font-semibold text-dark bg-white"
                />
                <button
                  onClick={handleIncrease}
                  className="w-12 h-full bg-bglight hover:bg-primary-light hover:text-white transition flex items-center justify-center text-xl cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={
                !selectedVariant || selectedVariant.batches_sum_stock <= 0
              }
              className={`flex-1 h-12 text-white font-semibold rounded-lg transition shadow-md flex items-center justify-center gap-2 ${
                !selectedVariant || selectedVariant.batches_sum_stock <= 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-primary hover:bg-primary-dark cursor-pointer"
              }`}
            >
              <i className="fas fa-shopping-cart"></i>
              {selectedVariant && selectedVariant.batches_sum_stock <= 0
                ? "Hết hàng"
                : "Thêm vào giỏ"}
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center transition shadow-sm cursor-pointer ${
                isInWishlist(product.id)
                  ? "border-red-500 text-red-500 bg-red-50 hover:bg-red-100"
                  : "border-gray-200 text-gray-500 hover:border-red-500 hover:text-red-500"
              }`}
              title={
                isInWishlist(product.id)
                  ? "Xóa khỏi danh sách yêu thích"
                  : "Thêm vào danh sách yêu thích"
              }
            >
              <i
                className={`${isInWishlist(product.id) ? "fas" : "far"} fa-heart text-xl`}
              ></i>
            </button>
          </div>
        </div>
      </div>

      {/* MÔ TẢ CHI TIẾT SẢN PHẨM */}
      <div className="mt-16 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-dark mb-6 border-b border-gray-100 pb-4">
          Chi Tiết Sản Phẩm
        </h2>

        <div className="space-y-12">
          {/* Mô tả */}
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">
              Mô tả sản phẩm
            </h3>
            <div
              className="text-gray-600 leading-relaxed prose max-w-none"
              dangerouslySetInnerHTML={{
                __html:
                  product.description ||
                  "Chưa có mô tả chi tiết cho sản phẩm này.",
              }}
            />
          </div>

          {/* Thành phần */}
          {product.ingredient && (
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                Thành phần
              </h3>
              <div
                className="text-gray-600 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: product.ingredient }}
              />
            </div>
          )}

          {/* Cách dùng */}
          {product.usage_instruction && (
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                Cách dùng / Pha chế
              </h3>
              <div
                className="text-gray-600 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: product.usage_instruction }}
              />
            </div>
          )}
        </div>
      </div>

      {/* SẢN PHẨM LIÊN QUAN */}
      {relatedProducts.length > 0 && (
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-dark mb-8 pb-2 border-b-2 border-primary inline-block">
            Sản Phẩm Liên Quan
          </h2>
          {isRelatedLoading ? (
            <div className="flex justify-center py-10 text-primary">
              <i className="fas fa-spinner fa-spin text-3xl"></i>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
