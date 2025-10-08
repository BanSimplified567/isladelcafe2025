import LoadingPage from '@components/LoadingPage';
import Footer from '@components/Footer';
import useProductStore from '@store/useProductStore';
import '@style/Menu.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Menu() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const {
    products,
    isLoading,
    error,
    fetchProducts,
    cartItems,
    addToCart,
    getCartTotals,
  } = useProductStore();

  // Define your categories explicitly to match categoryDisplayNames
  const categoryTypes = useMemo(() => ['all', 'coffee', 'matcha', 'milk', 'juice', 'hot'], []);

  const categoryDisplayNames = {
    all: 'All Drinks',
    coffee: 'Coffee Series',
    matcha: 'Matcha Series',
    milk: 'Milk Based',
    juice: 'Juice & Tea',
    hot: 'Hot Drinks',
  };

  // Navigate to product details
  const navigateToProductDetails = useCallback(
    (productId) => {
      navigate(`/product/${productId}`);
    },
    [navigate]
  );

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Calculate quantities in cart by product and size
  const productQuantitiesInCart = useMemo(() => {
    const quantities = {};
    if (Array.isArray(cartItems)) {
      cartItems.forEach((item) => {
        if (item && item.id && item.size) {
          const key = `${item.id}_${item.size}`;
          quantities[key] = (quantities[key] || 0) + item.quantity;
        }
      });
    }
    return quantities;
  }, [cartItems]);

  const getProductQuantityInCart = useCallback(
    (productId, size) => {
      const key = `${productId}_${size}`;
      return productQuantitiesInCart[key] || 0;
    },
    [productQuantitiesInCart]
  );

  // Calculate available quantity by size
  const availableQuantityByProduct = useMemo(() => {
    const quantityMap = {};
    if (Array.isArray(products)) {
      products.forEach((product) => {
        if (product && product.product_id && product.quantities) {
          ['Small', 'Medium', 'Large'].forEach((size) => {
            const inCartQty = getProductQuantityInCart(product.product_id, size);
            const totalStock = parseInt(product.quantities[size] || 0);
            quantityMap[`${product.product_id}_${size}`] = Math.max(
              0,
              totalStock - inCartQty
            );
          });
        }
      });
    }
    return quantityMap;
  }, [products, getProductQuantityInCart]);

  const getAvailableQuantity = useCallback(
    (productId, size) => {
      const key = `${productId}_${size}`;
      return availableQuantityByProduct[key] || 0;
    },
    [availableQuantityByProduct]
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];

    let filtered = products.filter(product => (product.status || 'active') === 'active'); // Only show active products

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.type.toLowerCase() === selectedCategory.toLowerCase());
    }

    return filtered;
  }, [products, selectedCategory]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const aPrice = parseFloat(a.small_price) || 0;
      const bPrice = parseFloat(b.small_price) || 0;
      if (sortBy === 'price-low') return aPrice - bPrice;
      if (sortBy === 'price-high') return bPrice - aPrice;
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'category') return (a.type || '').localeCompare(b.type || '');
      return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
    });
  }, [filteredProducts, sortBy]);

  // Pagination
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProducts = sortedProducts.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      currentProducts,
    };
  }, [sortedProducts, currentPage, itemsPerPage]);

  // Navigation
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => (prev < paginationData.totalPages ? prev + 1 : prev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [paginationData.totalPages]);

  const handlePageClick = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if can add to cart
  const canAddToCart = useCallback(
    (productId, size) => {
      return getAvailableQuantity(productId, size) > 0;
    },
    [getAvailableQuantity]
  );

  // Update the handleAddToCart function
  const handleAddToCart = useCallback(
    (product, quantity, size) => {
      const availableQuantity = getAvailableQuantity(product.product_id, size);

      if (availableQuantity <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Out of Stock',
          text: `This product is out of stock for ${size} size.`,
          confirmButtonColor: '#6b705c',
        });
        return;
      }

      if (quantity > availableQuantity) {
        Swal.fire({
          icon: 'warning',
          title: 'Quantity Limit Reached',
          text: `You can only add ${availableQuantity} more of this item in ${size} size.`,
          confirmButtonColor: '#6b705c',
        });
        return;
      }

      const productToAdd = {
        id: parseInt(product.product_id),
        name: product.name,
        price: parseFloat(product[size.toLowerCase() + '_price']),
        quantity: quantity,
        image: product.image,
        size: size,
        quantityAvailable: parseInt(product.quantities[size] || 0),
        type: product.type || '',
      };

      addToCart(productToAdd);

      Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: `${quantity} ${product.name} (${size}) added to cart`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    },
    [addToCart, getAvailableQuantity]
  );

  // Render star rating
  const renderStarRating = useCallback((rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="menu-rating-stars">
        { [...Array(fullStars)].map((_, i) => (
          <span key={ `full-${i}` } className="menu-star-full">
            ★
          </span>
        )) }
        { hasHalfStar && <span className="menu-star-half">★</span> }
        { [...Array(emptyStars)].map((_, i) => (
          <span key={ `empty-${i}` } className="menu-star-empty">
            ☆
          </span>
        )) }
      </div>
    );
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingPage />
  }

  // Error state
  if (error) {
    return <div className="menu-error">{ error }</div>;
  }

  // Empty products state
  if (!products || products.length === 0) {
    return (
      <div className="menu-no-products">
        No products found. Please check the database connection.
        <br />
        <small>Debug: products array length: { products ? products.length : 'null' }</small>
      </div>
    );
  }

  const { currentProducts, totalPages } = paginationData;
  const cartTotal = getCartTotals();

  return (
    <>
      <div className="menu-container">
        <header className="menu-header">
          <h1 className="menu-title">COFFE SHOP MENU</h1>
          <p className="menu-subtitle">
            Indulge in our handcrafted coffee and refreshing beverages
          </p>
          <Link to="/cart" className="menu-cart-link" aria-label="View shopping cart" data-testid="cart-link">
            <span className="visually-hidden">View Cart</span>
            🛒 View Cart ({ cartTotal.itemCount } items)
          </Link>
        </header>

        <div className="menu-content">
          <aside className="menu-sidebar">
            <div className="menu-filter-box">
              <h2 className="menu-filter-title">Categories</h2>
              <ul className="menu-category-list">
                { categoryTypes.map((category) => (
                  <li key={ category } className="menu-category-item">
                    <button
                      onClick={ () => {
                        setSelectedCategory(category);
                        setCurrentPage(1);
                      } }
                      className={ `menu-category-btn ${selectedCategory === category ? 'menu-category-btn--active' : ''
                        }` }
                    >
                      { categoryDisplayNames[category] ||
                        category.charAt(0).toUpperCase() + category.slice(1) }
                    </button>
                  </li>
                )) }
              </ul>
            </div>
          </aside>

          <main className="menu-main">
            <div className="menu-toolbar">
              <p className="menu-results-count">{ sortedProducts.length } drinks found</p>
              <div className="menu-sort">
                <label htmlFor="sort" className="menu-sort-label">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={ sortBy }
                  onChange={ (e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  } }
                  className="menu-sort-select"
                >
                  <option className="menu-sort-option" value="popular">
                    Most Popular
                  </option>
                  <option className="menu-sort-option" value="price-low">
                    Price: Low to High
                  </option>
                  <option className="menu-sort-option" value="price-high">
                    Price: High to Low
                  </option>
                  <option className="menu-sort-option" value="newest">
                    Newest Arrivals
                  </option>
                </select>
              </div>
            </div>

            <div className="menu-grid">
              { currentProducts.length > 0 ? (
                currentProducts.map((product) => {
                  const isAtMaxQuantity = !canAddToCart(product.product_id, 'Small');
                  const productId = product.product_id;

                  return (
                    <article key={ productId } className="menu-card menu-card-fadein" data-testid="product-card">
                      <div className="menu-card-image">
                        <img
                          src={ `/api/serve_image.php?image=${encodeURIComponent(product.image || 'Isladelcafe.jpg')}&type=product` }
                          alt={ product.name }
                          className="menu-card-img"
                          onError={ (e) => {
                            e.target.onerror = null;
                            e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                          } }
                          data-testid="product-image"
                        />
                      </div>
                      <div className="menu-card-body">
                        <h3 className="menu-card-title">{ product.name }</h3>
                        <div className="menu-card-rating">
                          { !isNaN(parseFloat(product.rating)) ? (
                            <>
                              { renderStarRating(parseFloat(product.rating)) }
                              <span className="menu-rating-text">
                                { parseFloat(product.rating).toFixed(1) } (
                                { product.reviews
                                  ? parseFloat(product.reviews).toFixed()
                                  : '0' }{ ' ' }
                                reviews)
                              </span>
                            </>
                          ) : (
                            <span className="menu-rating-text">No ratings yet</span>
                          ) }
                        </div>
                        <div className="menu-card-price">
                          ₱{ parseFloat(product.small_price).toFixed(2) }
                        </div>
                        <p className="menu-card-desc">
                          { product.description || 'No description available' }
                        </p>
                        <div className="menu-card-actions">
                          <button
                            className="menu-btn menu-btn--view"
                            aria-label={ `View details for ${product.name}` }
                            onClick={ () => navigateToProductDetails(productId) }
                            data-testid="view-details-btn"
                          >
                            View Details
                          </button>
                          { isAtMaxQuantity ? (
                            <button className="menu-btn menu-btn--disabled" aria-label={ `Out of stock: ${product.name}` } disabled data-testid="out-of-stock-btn">
                              Out of Stock
                            </button>
                          ) : (
                            <button
                              className="menu-btn menu-btn--add"
                              aria-label={ `Add ${product.name} to cart` }
                              onClick={ () => handleAddToCart(product, 1, 'Small') }
                              data-testid="add-to-cart-btn"
                            >
                              Add to Cart
                            </button>
                          ) }
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="menu-empty">No products found for the selected filters.</div>
              ) }
            </div>

            { totalPages > 0 && (
              <div className="menu-pagination">
                <nav className="menu-pagination-nav">
                  <button
                    className={ `menu-pagination-btn ${currentPage === 1 ? 'menu-pagination-btn--disabled' : ''
                      }` }
                    onClick={ handlePrevPage }
                    disabled={ currentPage === 1 }
                  >
                    Previous
                  </button>
                  { Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={ page }
                      onClick={ () => handlePageClick(page) }
                      className={ `menu-pagination-btn ${page === currentPage ? 'menu-pagination-btn--active' : ''
                        }` }
                    >
                      { page }
                    </button>
                  )) }
                  <button
                    className={ `menu-pagination-btn ${currentPage === totalPages ? 'menu-pagination-btn--disabled' : ''
                      }` }
                    onClick={ handleNextPage }
                    disabled={ currentPage === totalPages }
                  >
                    Next
                  </button>
                </nav>
              </div>
            ) }
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Menu;
