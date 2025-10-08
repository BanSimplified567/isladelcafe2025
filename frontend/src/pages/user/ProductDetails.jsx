import useProductStore from '@store/useProductStore';
import '@style/ProductsDetails.css';
import { ArrowLeft, Heart, Minus, Plus, ShoppingCart, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedSize, setSelectedSize] = useState('Small');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef(null);

  const { cartItems, addToCart, getProductById, products, fetchProducts } = useProductStore();

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        if (!products || products.length === 0) {
          await fetchProducts();
        }

        const productData = getProductById(parseInt(id));
        if (productData) {
          setProduct(productData);
          setSelectedSize('Small');
          setError(null);
        } else {
          throw new Error('Product not found');
        }
      } catch (err) {
        setError('Failed to fetch product details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id, getProductById, products, fetchProducts]);

  // Calculate quantities in cart by size
  const productQuantitiesInCart = useMemo(() => {
    const quantities = { Small: 0, Medium: 0, Large: 0 };
    if (Array.isArray(cartItems)) {
      cartItems.forEach((item) => {
        if (item && item.id === parseInt(id) && item.size) {
          quantities[item.size] = (quantities[item.size] || 0) + item.quantity;
        }
      });
    }
    return quantities;
  }, [cartItems, id]);

  // Calculate available quantity for selected size
  const getAvailableQuantity = () => {
    if (!product || !product.quantities) return 0;
    const inCartQty = productQuantitiesInCart[selectedSize] || 0;
    const totalStock = parseInt(product.quantities[selectedSize] || 0);
    return Math.max(0, totalStock - inCartQty);
  };

  const availableQuantity = getAvailableQuantity();

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setQuantity(1); // Reset quantity when size changes
  };

  const handleAddToCart = () => {
    if (!product) return;

    const availableQty = getAvailableQuantity();
    if (availableQty <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Out of Stock',
        text: `This item is out of stock for ${selectedSize} size.`,
        confirmButtonColor: '#6b705c',
      });
      return;
    }

    if (quantity > availableQty) {
      Swal.fire({
        icon: 'warning',
        title: 'Quantity Limit Reached',
        text: `You can only add ${availableQty} more of this item in ${selectedSize} size.`,
        confirmButtonColor: '#6b705c',
      });
      return;
    }

    const productToAdd = {
      id: parseInt(product.product_id),
      name: product.name,
      price: parseFloat(product[selectedSize.toLowerCase() + '_price']),
      quantity: parseInt(quantity),
      image: product.image,
      size: selectedSize,
      quantityAvailable: parseInt(product.quantities[selectedSize] || 0),
      type: product.type || '',
    };

    addToCart(productToAdd);


    Swal.fire({
      icon: 'success',
      title: 'Added to Cart',
      text: `${quantity} ${product.name} (${selectedSize}) added to cart`,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });

    if (quantity >= availableQty) {
      navigate('/cart');
    }
  };

  const toggleFavorite = () => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let updatedFavorites;

    if (isFavorite) {
      updatedFavorites = storedFavorites.filter(favId => favId !== parseInt(id));
    } else {
      updatedFavorites = [...new Set([...storedFavorites, parseInt(id)])];
    }

    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    setIsFavorite(!isFavorite);

    Swal.fire({
      icon: 'success',
      title: isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
      text: isFavorite
        ? `${product.name} has been removed from your favorites.`
        : `${product.name} has been added to your favorites.`,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  };

  useEffect(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (storedFavorites.includes(parseInt(id))) {
      setIsFavorite(true);
    }
  }, [id]);



  const handleImageMouseEnter = () => setIsZoomed(true);

  const handleImageMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const handleImageMouseLeave = () => setIsZoomed(false);


  const getDisplayPrice = () => {
    if (!product) return 0;
    return parseFloat(product[selectedSize.toLowerCase() + '_price']) || 0;
  };



  if (loading) {
    return (
      <div className="product-details-loading">
        <div className="coffee-loader">
          <div className="coffee-cup"></div>
          <div className="steam">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Brewing your coffee details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-details-not-found">
        <div className="product-details-not-found-content">
          <h2 className="product-details-not-found-title">Product not found</h2>
          <p className="product-details-not-found-message">
            { error || 'Unable to locate the requested product' }
          </p>
          <button
            onClick={ () => navigate('/menu') }
            className="product-details-not-found-button"
          >
            <ArrowLeft className="product-details-icon" />
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const rating = parseFloat(product.rating || 0);
  const displayPrice = getDisplayPrice();

  return (
    <div className="product-details-container">
      <div className="product-details-wrapper">
        <button onClick={ () => navigate('/menu') } className="product-details-back-button">
          <ArrowLeft className="product-details-icon" />
          Back to Menu
        </button>

        <div className="product-details-card product-details-fadein" data-testid="product-details-card">
          <div className="product-details-content">
            <div className="product-details-image-container">
              <div
                className="product-details-image-zoom-container"
                ref={ imageContainerRef }
                onMouseEnter={ handleImageMouseEnter }
                onMouseMove={ handleImageMouseMove }
                onMouseLeave={ handleImageMouseLeave }
                style={ { overflow: 'hidden', position: 'relative', width: '100%', height: '350px' } }
              >
                <img
                  src={ `/api/serve_image.php?image=${encodeURIComponent(product.image || 'Isladelcafe.jpg')}&type=product` }
                  alt={ product.name }
                  className="menu-card-img"
                  onError={ (e) => {
                    e.target.onerror = null;
                    e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                  } }
                  data-testid="product-image"
                  style={ {
                    transition: 'transform 0.3s, transform-origin 0.1s',
                    transform: isZoomed ? 'scale(2)' : 'scale(1)',
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                    cursor: isZoomed ? 'zoom-in' : 'pointer',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  } }
                />
              </div>
              <div className="product-details-image-actions">
                <button
                  onClick={ toggleFavorite }
                  className={ `product-details-favorite-button ${isFavorite ? 'product-details-favorite-active' : ''}` }
                  aria-label={ isFavorite ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites` }
                  data-testid="favorite-btn"
                >
                  <Heart
                    className="product-details-icon"
                    fill={ isFavorite ? 'currentColor' : 'none' }
                  />
                 
                </button>
              </div>

              <div className="product-details-section">
                <h2 className="product-details-section-title">Details</h2>
                <dl className="product-details-specs">
                  <div className="product-details-spec-item">
                    <dt className="product-details-spec-label">Category:</dt>
                    <dd className="product-details-spec-value product-details-capitalize">
                      { product.type || 'Uncategorized' }
                    </dd>
                  </div>
                  { product.subtype && (
                    <div className="product-details-spec-item">
                      <dt className="product-details-spec-label">Subcategory:</dt>
                      <dd className="product-details-spec-value product-details-capitalize">
                        { product.subtype }
                      </dd>
                    </div>
                  ) }
                  <div className="product-details-spec-item">
                    <dt className="product-details-spec-label">Available Sizes:</dt>
                    <dd className="product-details-spec-value">
                      { ['Small', 'Medium', 'Large'].map((size) => (
                        <span key={ size }>
                          { size }: { product.quantities?.[size] || 0 } available
                          { size !== 'Large' ? ', ' : '' }
                        </span>
                      )) }
                    </dd>
                  </div>
                  { product.temperature && (
                    <div className="product-details-spec-item">
                      <dt className="product-details-spec-label">Temperature:</dt>
                      <dd className="product-details-spec-value">
                        { product.temperature }
                      </dd>
                    </div>
                  ) }
                  { product.caffeine_level && (
                    <div className="product-details-spec-item">
                      <dt className="product-details-spec-label">Caffeine Level:</dt>
                      <dd className="product-details-spec-value">
                        { product.caffeine_level }
                      </dd>
                    </div>
                  ) }
                  <div className="product-details-spec-item">
                    <dt className="product-details-spec-label">Availability:</dt>
                    <dd
                      className={ `product-details-spec-value ${availableQuantity > 0
                        ? 'product-details-in-stock'
                        : 'product-details-out-of-stock'
                        }` }
                    >
                      { availableQuantity > 0
                        ? `In Stock (${availableQuantity} available for ${selectedSize})`
                        : `Out of Stock (${selectedSize})` }
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="product-details-info">
              <div className="product-details-header">
                <div>
                  <h1 className="product-details-title">{ product.name }</h1>
                  <div className="product-details-rating">
                    { [...Array(5)].map((_, index) => (
                      <Star
                        key={ index }
                        className={ `product-details-star ${index < rating
                          ? 'product-details-star-filled'
                          : 'product-details-star-empty'
                          }` }
                        fill={ index < rating ? '#FFD700' : 'none' }
                        stroke={ index < rating ? '#FFD700' : 'currentColor' }
                      />
                    )) }
                    <span className="product-details-reviews">
                      ({ rating.toFixed(1) }) { product.reviews || 0 } reviews
                    </span>
                  </div>
                </div>
                <div className="product-details-container">
                  <div className="product-details-price-container">
                    <p className="product-details-price">₱{ displayPrice.toFixed(2) }</p>
                    { selectedSize !== 'Small' && (
                      <p className="product-details-original-price">
                        (Small: ₱{ parseFloat(product.small_price).toFixed(2) })
                      </p>
                    ) }
                  </div>
                </div>
              </div>
              <div className="product-details-section">
                <h2 className="product-details-section-title">Description</h2>
                <p className="product-details-description">
                  { product.description || 'No description available' }
                </p>
              </div>

              <div className="product-details-actions">
                <div className="product-details-size-selector">
                  <label className="product-details-size-label">Size:</label>
                  <div className="product-details-size-options">
                    { ['Small', 'Medium', 'Large'].map((size) => (
                      <button
                        key={ size }
                        className={ `product-details-size-option ${selectedSize === size ? 'product-details-size-selected' : ''
                          }` }
                        onClick={ () => handleSizeChange(size) }
                        disabled={ (product.quantities?.[size] || 0) <= 0 }
                      >
                        { size } (₱
                        { parseFloat(product[size.toLowerCase() + '_price']).toFixed(2) })

                      </button>
                    )) }
                  </div>
                </div>

                <div className="product-details-quantity">
                  <label htmlFor="quantity" className="product-details-quantity-label">
                    Quantity:
                  </label>
                  <div className="product-details-quantity-controls">
                    <button
                      onClick={ () => setQuantity(Math.max(1, quantity - 1)) }
                      disabled={ quantity <= 1 }
                      className="product-details-quantity-button"
                    >
                      <Minus size={ 16 } />
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      max={ availableQuantity }
                      value={ quantity }
                      onChange={ (e) => {
                        const newQty = parseInt(e.target.value) || 1;
                        setQuantity(Math.min(availableQuantity, Math.max(1, newQty)));
                      } }
                      className="product-details-quantity-input"
                      disabled={ availableQuantity <= 0 }
                    />
                    <button
                      onClick={ () =>
                        setQuantity(Math.min(availableQuantity, quantity + 1))
                      }
                      disabled={ quantity >= availableQuantity }
                      className="product-details-quantity-button"
                    >
                      <Plus size={ 16 } />
                    </button>
                  </div>
                </div>

                <button
                  className={ `product-details-add-button ${availableQuantity <= 0 ? 'product-details-button-disabled' : ''
                    }` }
                  onClick={ handleAddToCart }
                  disabled={ availableQuantity <= 0 }
                >
                  <ShoppingCart className="product-details-icon" />
                  { availableQuantity <= 0 ? 'Out of Stock' : 'Add to Cart' }
                </button>
              </div>
              <div className="product-details-cart-status">
                <button
                  onClick={ () => navigate('/cart') }
                  className="product-details-view-cart-button"
                >
                  View Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;
