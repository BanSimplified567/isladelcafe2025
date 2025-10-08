import Swal from 'sweetalert2';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useProductStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      products: [],
      isLoading: false,
      error: null,
      pagination: { total: 0, page: 1, limit: 8, total_pages: 1 },

      initialize: async () => {
        try {
          const savedState = JSON.parse(localStorage.getItem('coffeeShopStore'));
          if (savedState) {
            set({
              cartItems: Array.isArray(savedState.cartItems) ? savedState.cartItems : [],
              products: Array.isArray(savedState.products) ? savedState.products : [],
              pagination: savedState.pagination || { total: 0, page: 1, limit: 8, total_pages: 1 },
            });
          }
          // Fetch fresh products if none loaded
          if (get().products.length === 0) {
            await get().fetchProducts();
          }
        } catch (error) {
          console.error('Failed to initialize store from localStorage', error);
          set({ cartItems: [], products: [], pagination: { total: 0, page: 1, limit: 8, total_pages: 1 } });
          await get().fetchProducts();
        }
      },

      getCartTotals: () => {
        const { cartItems } = get();
        if (!Array.isArray(cartItems)) {
          return { subtotal: 0, itemCount: 0, total: 0 };
        }

        const subtotal = cartItems.reduce((total, item) => {
          const price = parseFloat(item.price) || 0;
          return total + price * item.quantity;
        }, 0);

        const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
        const total = subtotal;

        return { subtotal, itemCount, total };
      },

      addToCart: async (product) => {
        const { fetchProducts, products } = get();
        if (products.length === 0) {
          await fetchProducts();
        }

        const standardizedProduct = {
          id: parseInt(product.product_id) || 0,
          name: product.name || 'Unknown Product',
          quantity: parseInt(product.quantity) || 1,
          image: product.image || '/assets/Isladelcafe.jpg',
          size: product.size || 'Small',
          type: product.type || 'Other',
          price: 0,
        };

        set((state) => {
          const productInStore = state.products.find((p) => p.product_id === standardizedProduct.id);
          if (!productInStore) {
            Swal.fire({
              icon: 'error',
              title: 'Product Not Found',
              text: 'This product is no longer available.',
              confirmButtonColor: '#6b705c',
            });
            return state;
          }

          const sizePriceKey = `${standardizedProduct.size.toLowerCase()}_price`;
          const sizeQuantityKey = `${standardizedProduct.size.toLowerCase()}_quantity`;
          const price = parseFloat(productInStore[sizePriceKey]) || 0;
          if (price <= 0) {
            Swal.fire({
              icon: 'error',
              title: 'Invalid Price',
              text: `No valid price found for ${standardizedProduct.size} size.`,
              confirmButtonColor: '#6b705c',
            });
            return state;
          }
          standardizedProduct.price = price;

          const availableStock = parseInt(productInStore[sizeQuantityKey]) || 0;
          if (availableStock <= 0) {
            Swal.fire({
              icon: 'warning',
              title: 'Out of Stock',
              text: `This item is out of stock for ${standardizedProduct.size} size.`,
              confirmButtonColor: '#6b705c',
            });
            return state;
          }

          const totalProductQuantity = state.cartItems.reduce((total, item) => {
            if (item.id === standardizedProduct.id && item.size === standardizedProduct.size) {
              return total + item.quantity;
            }
            return total;
          }, 0);

          const remainingStock = availableStock - totalProductQuantity;
          if (standardizedProduct.quantity > remainingStock) {
            Swal.fire({
              icon: 'warning',
              title: 'Quantity Limit Reached',
              text: `Only ${remainingStock} items available for ${standardizedProduct.size} size.`,
              confirmButtonColor: '#6b705c',
            });
            standardizedProduct.quantity = remainingStock;
          }

          const coffeeTypes = ['coffee', 'espresso', 'latte', 'cappuccino'];
          const isCoffee = coffeeTypes.includes(productInStore.type.toLowerCase());
          const pointsEarned = isCoffee ? standardizedProduct.quantity : 0;

          const existingItemIndex = state.cartItems.findIndex(
            (item) => item.id === standardizedProduct.id && item.size === standardizedProduct.size
          );

          if (existingItemIndex >= 0) {
            const existingItem = state.cartItems[existingItemIndex];
            const newQuantity = existingItem.quantity + standardizedProduct.quantity;

            if (newQuantity > availableStock) {
              Swal.fire({
                icon: 'warning',
                title: 'Quantity Limit Reached',
                text: `Only ${remainingStock} items available for ${standardizedProduct.size} size.`,
                confirmButtonColor: '#6b705c',
              });
              return { cartItems: [...state.cartItems] };
            }

            const updatedItems = [...state.cartItems];
            updatedItems[existingItemIndex] = {
              ...existingItem,
              quantity: newQuantity,
              price,
              quantityAvailable: availableStock,
            };

            Swal.fire({
              icon: 'success',
              title: 'Cart Updated',
              text: `Updated ${standardizedProduct.name} (${standardizedProduct.size}) quantity to ${newQuantity}${pointsEarned > 0 ? ` and earned ${pointsEarned} loyalty point${pointsEarned > 1 ? 's' : ''}` : ''}`,
              timer: 1500,
              toast: true,
              position: 'top-end',
            });

            return { cartItems: updatedItems };
          }

          if (standardizedProduct.quantity <= 0) {
            return state;
          }

          Swal.fire({
            icon: 'success',
            title: 'Added to Cart',
            text: `${standardizedProduct.quantity} ${standardizedProduct.name} (${standardizedProduct.size}) added to cart${pointsEarned > 0 ? ` and earned ${pointsEarned} loyalty point${pointsEarned > 1 ? 's' : ''}` : ''}`,
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
          });

          return { cartItems: [...state.cartItems, standardizedProduct] };
        });
      },

      updateQuantity: (id, size, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id, size);
          return;
        }

        set((state) => {
          const item = state.cartItems.find((item) => item.id === id && item.size === size);
          if (!item) {
            Swal.fire({
              icon: 'error',
              title: 'Item Not Found',
              text: `The item with size ${size} is not in your cart.`,
              confirmButtonColor: '#6b705c',
            });
            return state;
          }

          const product = state.products.find((p) => p.product_id === id);
          if (!product) {
            Swal.fire({
              icon: 'error',
              title: 'Product Not Found',
              text: 'This product is no longer available.',
              confirmButtonColor: '#6b705c',
            });
            return state;
          }

          const sizeQuantityKey = size.toLowerCase() + '_quantity';
          const sizePriceKey = size.toLowerCase() + '_price';
          const availableStock = parseInt(product[sizeQuantityKey]) || 0;
          const price = parseFloat(product[sizePriceKey]) || 0;

          const totalQuantityInCart = state.cartItems.reduce((total, cartItem) => {
            if (cartItem.id === id && cartItem.size === size && cartItem !== item) {
              return total + cartItem.quantity;
            }
            return total;
          }, 0);

          const totalRequestedQuantity = totalQuantityInCart + quantity;
          if (totalRequestedQuantity > availableStock) {
            Swal.fire({
              icon: 'warning',
              title: 'Quantity Limit Reached',
              text: `Only ${availableStock - totalQuantityInCart} items available for ${size} size.`,
              confirmButtonColor: '#6b705c',
            });
            return {
              cartItems: state.cartItems.map((cartItem) =>
                cartItem.id === id && cartItem.size === size
                  ? { ...cartItem, quantity: availableStock - totalQuantityInCart }
                  : cartItem
              ),
            };
          }

          return {
            cartItems: state.cartItems.map((cartItem) =>
              cartItem.id === id && cartItem.size === size
                ? { ...cartItem, quantity, price, quantityAvailable: availableStock }
                : cartItem
            ),
          };
        });
      },

      removeItem: (id, size) => {
        set((state) => {
          const updatedCartItems = state.cartItems.filter(
            (item) => !(item.id === id && item.size === size)
          );
          Swal.fire({
            icon: 'success',
            title: 'Item Removed',
            text: 'The item has been removed from your cart.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
          });
          return { cartItems: updatedCartItems };
        });
      },

      clearCart: () => {
        set({ cartItems: [] });
        localStorage.removeItem('coffeeShopStore');
        return Promise.resolve(true);
      },

      fetchProducts: async (page = 1, limit = 8, filters = {}) => {
        try {
          set({ isLoading: true, error: null });
          const queryParams = new URLSearchParams({
            action: 'get-products',
            page,
            limit,
            ...filters,
          });
          const response = await fetch(
            `http://localhost:8000/backend/public/index.php?${queryParams}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || 'Failed to fetch products');
          }

          const transformedProducts = data.products.map((product) => ({
            product_id: parseInt(product.product_id) || 0,
            name: product.name || 'Unknown Product',
            description: product.description || '',
            image: product.image || '/assets/Isladelcafe.jpg',
            type: (product.type || 'Other').toLowerCase(),
            subtype: product.subtype || '',
            temperature: product.temperature || '',
            rating: parseFloat(product.rating) || 0,
            reviews: parseInt(product.reviews) || 0,
            caffeine_level: product.caffeine_level || '',
            small_price: parseFloat(product.small_price) || 0,
            medium_price: parseFloat(product.medium_price) || 0,
            large_price: parseFloat(product.large_price) || 0,
            small_quantity: parseInt(product.small_quantity) || 0,
            medium_quantity: parseInt(product.medium_quantity) || 0,
            large_quantity: parseInt(product.large_quantity) || 0,
            total_stock: parseInt(product.total_stock) || 0,
            low_stock_threshold: parseInt(product.low_stock_threshold) || 5,
            status: product.status || 'active',
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || new Date().toISOString(),
          }));

          set({
            products: transformedProducts,
            isLoading: false,
            pagination: data.pagination || { total: 0, page: 1, limit, total_pages: 1 },
          });
        } catch (error) {
          console.error('Error fetching products:', error);
          set({
            error: 'Failed to fetch products: ' + error.message,
            isLoading: false,
            products: [],
            pagination: { total: 0, page: 1, limit, total_pages: 1 },
          });
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to fetch products. Please try again later.',
            confirmButtonColor: '#6b705c',
          });
        }
      },

      getProductById: (productId) => {
        const { products } = get();
        return products.find((product) => product.product_id === parseInt(productId)) || null;
      },

      filterProductsByType: (type) => {
        const { products } = get();
        return products.filter((product) => product.type.toLowerCase() === type.toLowerCase());
      },

      getProductTypes: () => {
        const { products } = get();
        return [...new Set(products.map((product) => product.type))];
      },

      clearProducts: () => {
        set({ products: [], isLoading: false, error: null, pagination: { total: 0, page: 1, limit: 8, total_pages: 1 } });
      },
    }),
    {
      name: 'coffeeShopStore',
      getStorage: () => localStorage,
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          return {
            ...persistedState,
            cartItems: Array.isArray(persistedState.cartItems) ? persistedState.cartItems : [],
            products: Array.isArray(persistedState.products) ? persistedState.products : [],
            pagination: { total: 0, page: 1, limit: 8, total_pages: 1 },
          };
        }
        return persistedState;
      },
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;
        return {
          ...currentState,
          ...persistedState,
          cartItems: Array.isArray(persistedState.cartItems) ? persistedState.cartItems : [],
          products: Array.isArray(persistedState.products) ? persistedState.products : [],
          pagination: persistedState.pagination || { total: 0, page: 1, limit: 8, total_pages: 1 },
        };
      },
    }
  )
);

export default useProductStore;
