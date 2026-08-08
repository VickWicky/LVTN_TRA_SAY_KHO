import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getImageUrl, removeVietnameseTones } from "../utils";
import ProductCard from "../components/ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceRange, sortOrder]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_URL}/api/products`),
          fetch(`${API_URL}/api/categories`),
        ]);
        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data);
        }
        if (catRes.ok) {
          const data = await catRes.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Lấy giá min/max cho từng sản phẩm
  const processedProducts = products.map((product) => {
    let minPrice = 0;
    let maxPrice = 0;
    let isDiscounted = false;
    let maxDiscountPercent = 0;

    let prices = [];

    if (product.variants && product.variants.length > 0) {
      prices = product.variants.map((v) => {
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
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }
    return {
      ...product,
      minPrice,
      maxPrice,
      isDiscounted,
      maxDiscountPercent,
      prices,
    };
  });

  // Filter
  const normalizedSearchTerm = removeVietnameseTones(searchTerm).toLowerCase();

  let filteredProducts = processedProducts.filter((p) => {
    const matchesSearch = removeVietnameseTones(p.name)
      .toLowerCase()
      .includes(normalizedSearchTerm);
    const matchesCategory = selectedCategory
      ? p.category_id === Number(selectedCategory)
      : true;

    let matchesPrice = true;
    if (priceRange && p.prices) {
      matchesPrice = p.prices.some((price) => {
        if (priceRange === "under-100") return price < 100000;
        if (priceRange === "100-300") return price >= 100000 && price <= 300000;
        if (priceRange === "300-500") return price > 300000 && price <= 500000;
        if (priceRange === "over-500") return price > 500000;
        return true;
      });
    }

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Sort
  if (sortOrder === "price-asc") {
    filteredProducts.sort((a, b) => a.minPrice - b.minPrice);
  } else if (sortOrder === "price-desc") {
    filteredProducts.sort((a, b) => b.minPrice - a.minPrice);
  } else if (sortOrder === "name-asc") {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOrder === "name-desc") {
    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
  }

  // Cắt dữ liệu cho trang hiện tại
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-primary-light text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-7xl">
          <h1 className="text-4xl font-bold mb-3">Danh Mục Sản Phẩm</h1>
          <p className="text-lg opacity-90">
            Khám phá bộ sưu tập trà sấy khô chất lượng cao
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row gap-4 mb-10 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition"
              />
              {/* Drowdown gợi ý */}
              {isSearchFocused && searchTerm.trim().length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-[100] animate-fade-in">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                    Gợi ý tìm kiếm
                  </div>
                  {products
                    .map((p) => p.name)
                    .filter((name) =>
                      removeVietnameseTones(name)
                        .toLowerCase()
                        .includes(normalizedSearchTerm),
                    )
                    .slice(0, 8)
                    .map((kw, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSearchTerm(kw);
                          setIsSearchFocused(false);
                          setSearchParams({ search: kw });
                        }}
                        className="px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary cursor-pointer flex items-center gap-2 transition-colors"
                      >
                        <i className="fas fa-search text-gray-400 text-xs"></i>
                        <span>{kw}</span>
                      </div>
                    ))}
                  {products.filter((p) =>
                    removeVietnameseTones(p.name)
                      .toLowerCase()
                      .includes(normalizedSearchTerm),
                  ).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      Không tìm thấy sản phẩm nào phù hợp
                    </div>
                  )}
                </div>
              )}
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white cursor-pointer min-w-[150px]"
            >
              <option value="">Tất Cả Danh Mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white cursor-pointer min-w-[150px]"
            >
              <option value="">Tất cả mức giá</option>
              <option value="under-100">Dưới 100.000₫</option>
              <option value="100-300">100.000₫ - 300.000₫</option>
              <option value="300-500">300.000₫ - 500.000₫</option>
              <option value="over-500">Trên 500.000₫</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary transition bg-white cursor-pointer min-w-[150px]"
            >
              <option value="">Sắp xếp mặc định</option>
              <option value="name-asc">Tên: A-Z</option>
              <option value="name-desc">Tên: Z-A</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-xl font-bold text-primary">
              <i className="fas fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu
              sản phẩm...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-light text-lg">
              Không tìm thấy sản phẩm nào phù hợp.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-12 gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:hover:border-gray-300 transition"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 flex items-center justify-center rounded-full border transition font-medium ${
                        currentPage === i + 1
                          ? "bg-primary text-white border-primary shadow-md"
                          : "border-gray-300 text-gray-700 hover:border-primary hover:text-primary hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-primary hover:text-white hover:border-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-500 disabled:hover:border-gray-300 transition"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
