import { createContext, useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState([]);

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/wishlists`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setWishlistItems(data);
        }
      } catch (error) {
        console.error("Failed to fetch wishlist:", error);
      }
    };

    fetchWishlist();
  }, []);

  const toggleWishlist = async (product) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.warning(
        "Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích",
      );
      return;
    }

    const existing = wishlistItems.find(
      (item) => Number(item.id) === Number(product.id),
    );
    if (existing) {
      setWishlistItems((prev) =>
        prev.filter((item) => Number(item.id) !== Number(product.id)),
      );
    } else {
      setWishlistItems((prev) => [...prev, product]);
    }

    try {
      const res = await fetch(`${API_URL}/api/wishlists/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ product_id: product.id }),
      });

      if (!res.ok) {
        throw new Error("Lỗi từ server");
      }
    } catch (error) {
      console.error("Lỗi khi toggle wishlist:", error);
      toast.error("Có lỗi xảy ra, vui lòng thử lại");
      if (existing) {
        setWishlistItems((prev) => [...prev, product]);
      } else {
        setWishlistItems((prev) =>
          prev.filter((item) => Number(item.id) !== Number(product.id)),
        );
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    const product = wishlistItems.find(
      (p) => Number(p.id) === Number(productId),
    );
    if (product) {
      await toggleWishlist(product);
    }
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => Number(item.id) === Number(productId));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        toggleWishlist,
        removeFromWishlist,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
