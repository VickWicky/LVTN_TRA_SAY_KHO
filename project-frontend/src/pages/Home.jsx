import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils";
import { useWishlist } from "../contexts/WishlistContext";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [topProducts, setTopProducts] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topRes, saleRes, bannerRes] = await Promise.all([
          fetch(`${API_URL}/api/products/top-random`),
          fetch(`${API_URL}/api/products/on-sale`),
          fetch(`${API_URL}/api/public/banners`),
        ]);

        if (topRes.ok && saleRes.ok) {
          const topData = await topRes.json();
          const saleData = await saleRes.json();
          setTopProducts(topData);
          setSaleProducts(saleData);
        }
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          setBanners(bannerData);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderProductCard = (product, isSaleSection = false) => {
    let minPrice = 0;
    let maxPrice = 0;
    let isDiscounted = false;
    let maxDiscountPercent = 0;

    if (product.variants && product.variants.length > 0) {
      const currentPrices = product.variants.map((v) => {
        if (v.sale_price && v.sale_price > 0 && v.sale_price < v.price) {
          const discountPercent = Math.round(
            (1 - v.sale_price / v.price) * 100,
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
    }

    return (
      <article
        key={product.id}
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
            <span className="text-lg font-bold text-primary">
              {minPrice === maxPrice || maxPrice === 0
                ? `${Number(minPrice).toLocaleString("vi-VN")}₫`
                : `${Number(minPrice).toLocaleString("vi-VN")}₫ - ${Number(maxPrice).toLocaleString("vi-VN")}₫`}
            </span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div>
      {/* HERO BANNER SLIDER */}
      <section className="relative w-full h-[600px] overflow-hidden bg-dark">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"}`}
          >
            <img
              src={getImageUrl(banner.image_url)}
              alt={banner.title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4 max-w-4xl transform transition-transform duration-1000 translate-y-0">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-wide drop-shadow-lg">
                  {banner.title}
                </h1>
                <p className="text-xl md:text-2xl text-gray-200 mb-10 drop-shadow-md">
                  {banner.subtitle}
                </p>
                {banner.cta_link && (
                  <Link
                    to={banner.cta_link}
                    className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-4 px-10 rounded-full transition transform hover:scale-105 shadow-xl text-lg uppercase tracking-wider"
                  >
                    {banner.cta_text || "Khám phá ngay"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* SLIDE BUTTON */}
        <button
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === 0 ? banners.length - 1 : prev - 1,
            )
          }
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/50 text-white backdrop-blur transition z-10"
        >
          <i className="fas fa-chevron-left text-xl"></i>
        </button>
        <button
          onClick={() =>
            setCurrentSlide((prev) =>
              prev === banners.length - 1 ? 0 : prev + 1,
            )
          }
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/50 text-white backdrop-blur transition z-10"
        >
          <i className="fas fa-chevron-right text-xl"></i>
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide ? "bg-primary w-8" : "bg-white/50 hover:bg-white"}`}
            ></button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="text-center py-20 text-xl font-bold text-primary">
          <i className="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu sản
          phẩm...
        </div>
      ) : (
        <>
          {/* ZONE 1: SALE PRODUCTS*/}
          {saleProducts.length > 0 && (
            <section className="py-16 bg-red-50">
              <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex justify-between items-end mb-10 border-b border-red-200 pb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-red-600 flex items-center gap-3">
                      Siêu Ưu Đãi
                    </h2>
                    <p className="text-gray-600 mt-2">
                      Đừng bỏ lỡ các sản phẩm đang được giảm giá cực sâu
                    </p>
                  </div>
                  <Link
                    to="/products"
                    className="text-red-500 font-semibold hover:text-red-700 transition"
                  >
                    Xem tất cả &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {saleProducts.map((product) =>
                    renderProductCard(product, true),
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ZONE 2: TOP PRODUCTS (RANDOM) */}
          {topProducts.length > 0 && (
            <section className="py-16 bg-white">
              <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-dark mb-4">
                    Gợi Ý Cho Bạn
                  </h2>
                  <div className="h-1 w-24 bg-primary mx-auto rounded"></div>
                  <p className="text-light mt-4">
                    Những hương vị trà sấy khô tự nhiên được yêu thích nhất
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {topProducts.map((product) =>
                    renderProductCard(product, false),
                  )}
                </div>

                <div className="text-center mt-12">
                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center bg-primary text-white font-medium py-3 px-8 rounded-full shadow-md hover:bg-green-700 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    Xem Thêm <i className="fas fa-arrow-right ml-2"></i>
                  </Link>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Zone 3: WHY CHOOSE US */}
      <section className="bg-bglight py-20 mt-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl font-bold text-center text-dark mb-12">
            Tại Sao Chọn CK Tea?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-leaf"></i>
              </div>
              <h3 className="font-bold text-lg mb-2">100% Tự Nhiên</h3>
              <p className="text-light text-sm">
                Không chứa hóa chất, tất cả đều từ thiên nhiên
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-check-circle"></i>
              </div>
              <h3 className="font-bold text-lg mb-2">Chất Lượng Đảm Bảo</h3>
              <p className="text-light text-sm">
                Kiểm tra kỹ lưỡng qua từng khâu sản xuất
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-truck"></i>
              </div>
              <h3 className="font-bold text-lg mb-2">Giao Hàng Nhanh</h3>
              <p className="text-light text-sm">
                Đóng gói cẩn thận và giao tận tay nhanh chóng
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition transform hover:-translate-y-2">
              <div className="text-4xl text-primary mb-4">
                <i className="fas fa-heart"></i>
              </div>
              <h3 className="font-bold text-lg mb-2">Hỗ Trợ Tận Tâm</h3>
              <p className="text-light text-sm">
                Luôn sẵn sàng giải đáp mọi thắc mắc của bạn
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
