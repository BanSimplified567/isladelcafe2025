import useProductStore from '@store/useProductStore';
import '@style/Cart.css';
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Cart() {
  const { getCartTotals, cartItems, removeItem, clearCart, getProductById, updateQuantity } =
    useProductStore();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const navigate = useNavigate();

  const { subtotal, itemCount } = getCartTotals();

  // ✅ Only discount applies
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const discountedSubtotal = subtotal - discount;

  // ✅ Final total = discounted subtotal only
  const finalTotal = discountedSubtotal;

  // Function to get size counts for each item
  const getSizeCounts = (itemId) => {
    return cartItems
      .filter((item) => item.id === itemId)
      .reduce((acc, item) => {
        acc[item.size] = (acc[item.size] || 0) + item.quantity;
        return acc;
      }, {});
  };

  // Function to handle quantity change for a specific item and size
  const handleQuantityChange = (itemId, size, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(itemId, size);
      return;
    }
    updateQuantity(itemId, size, newQuantity);
  };

  // Function to increment quantity
  const incrementQuantity = (itemId, size, currentQuantity) => {
    const product = getProductById(itemId);
    if (!product) return;

    const sizeKey = size.toLowerCase() + '_quantity';
    const availableStock = parseInt(product[sizeKey]) || 0;

    // Check if we can add more
    const totalInCart = cartItems
      .filter((item) => item.id === itemId && item.size === size)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (totalInCart >= availableStock) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock Limit',
        text: `You've reached the maximum available stock (${availableStock}) for this size.`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      return;
    }

    handleQuantityChange(itemId, size, currentQuantity + 1);
  };

  // Function to decrement quantity
  const decrementQuantity = (itemId, size, currentQuantity) => {
    if (currentQuantity <= 1) {
      removeItem(itemId, size);
      return;
    }
    handleQuantityChange(itemId, size, currentQuantity - 1);
  };

  // Function to handle item removal with SweetAlert2 confirmation
  const handleRemoveItem = (itemId, sizeCounts) => {
    Swal.fire({
      title: 'Remove Item?',
      text: 'Are you sure you want to remove this item from your cart?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6b705c',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, remove it!',
    }).then((result) => {
      if (result.isConfirmed) {
        Object.keys(sizeCounts).forEach((size) => removeItem(itemId, size));
        Swal.fire({
          icon: 'success',
          title: 'Deleted Successfully',
          text: 'The item has been removed from your cart.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
      }
    });
  };

  // Group items by product ID with size breakdowns
  const groupedItems = cartItems.reduce((acc, item) => {
    if (!acc[item.id]) {
      acc[item.id] = {
        ...item,
        sizeCounts: getSizeCounts(item.id),
        totalQuantity: cartItems
          .filter((i) => i.id === item.id)
          .reduce((sum, i) => sum + i.quantity, 0),
      };
    }
    return acc;
  }, {});

  const applyPromoCode = () => {
    if (finalTotal < 200) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Required',
        text: 'Order minimum is ₱200 or higher.',
        confirmButtonColor: '#6b705c',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (promoCode.toLowerCase() === 'isladelcafe2025') {
      setPromoApplied(true);
      Swal.fire({
        icon: 'success',
        title: 'Promo Code Applied',
        text: '10% discount has been applied to your order!',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Promo Code',
        text: 'Please enter a valid promo code!',
      });
    }
  };

  const handleCheckout = () => {
    if (finalTotal < 200) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum Order Required',
        text: 'Order minimum is ₱200 or higher.',
        confirmButtonColor: '#6b705c',
        confirmButtonText: 'OK',
      });
      return;
    }

    Swal.fire({
      title: 'Proceed to Checkout?',
      text: `Your total is ₱${finalTotal.toFixed(2)}. Do you want to continue?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Checkout',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        // Store discount information in localStorage
        localStorage.setItem(
          'cartDiscount',
          JSON.stringify({
            applied: promoApplied,
            amount: discount,
            code: promoCode,
          })
        );
        navigate('/checkout');
      }
    });
  };

  if (!cartItems.length) {
    return (
      <div className="cart-container">
        <h1 className="cart-title">YOUR COFFEE ORDER</h1>
        <div className="cart-empty">
          <ShoppingCart size={ 48 } className="cart-empty-icon" />
          <p>Your cart is empty</p>
          <Link to="/menu" className="cart-continue">
            <ArrowLeft className="cart-icon" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const isBelowMinimum = finalTotal < 200;

  return (
    <div className="cart-container">
      <h1 className="cart-title">YOUR COFFEE ORDER ({ itemCount } items)</h1>

      <div className="cart-flex">
        <div className="cart-items-section">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Size Breakdown</th>
                <th>Price</th>
                <th>Total Quantity</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              { Object.values(groupedItems).map((item) => {
                const product = getProductById(item.id);
                const prices = product
                  ? {
                    Small: parseFloat(product.small_price) || 0,
                    Medium: parseFloat(product.medium_price) || 0,
                    Large: parseFloat(product.large_price) || 0,
                  }
                  : { Small: 0, Medium: 0, Large: 0 };

                return (
                  <tr key={ `cart-item-${item.id}` }>
                    <td data-label="Item">
                      <div className="cart-item-images-text">
                        { item.image && (
                          <img
                            src={ `/api/serve_image.php?image=${encodeURIComponent(product.image)}&type=product` }
                            alt={ product.name }
                            className="menu-card-img"
                            onError={ (e) => {
                              e.target.onerror = null;
                              e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                            } }
                            data-testid="product-image"
                          />
                        ) }
                        <div className="cart-item-details">
                          <span className="cart-item-name">{ item.name }</span>
                          { item.type && (
                            <span className="cart-item-type">Type: { item.type }</span>
                          ) }
                        </div>
                      </div>
                    </td>
                    <td data-label="Size Breakdown">
                      <div className="cart-size-breakdown">
                        { Object.entries(item.sizeCounts).map(([size, count]) => (
                          <div key={ `${item.id}-${size}` } className="cart-size-row">
                            <span>{ size }:</span>
                            <div className="cart-quantity-controls">
                              <button
                                onClick={ () => decrementQuantity(item.id, size, count) }
                                className="cart-quantity-btn"
                              >
                                -
                              </button>
                              <span className="cart-quantity-count">{ count }</span>
                              <button
                                onClick={ () => incrementQuantity(item.id, size, count) }
                                className="cart-quantity-btn"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )) }
                      </div>
                    </td>
                    <td data-label="Price">
                      <div className="cart-price-breakdown">
                        { Object.entries(item.sizeCounts).map(([size]) => (
                          <div
                            key={ `${item.id}-${size}-price` }
                            className="cart-price-row"
                          >
                            <span>₱{ prices[size].toFixed(2) }</span>
                          </div>
                        )) }
                      </div>
                    </td>
                    <td data-label="Total Quantity">{ item.totalQuantity }</td>
                    <td data-label="Total">
                      ₱
                      { cartItems
                        .filter((i) => i.id === item.id)
                        .reduce((sum, i) => {
                          const price = parseFloat(i.price) || 0;
                          return sum + price * i.quantity;
                        }, 0)
                        .toFixed(2) }
                    </td>
                    <td data-label="Actions">
                      <button
                        onClick={ () => handleRemoveItem(item.id, item.sizeCounts) }
                        className="cart-remove"
                        title="Remove item"
                      >
                        <Trash2 size={ 18 } />
                      </button>
                    </td>
                  </tr>
                );
              }) }
            </tbody>
          </table>
          <div className="cart-actions">
            <Link to="/menu" className="cart-continue">
              <ArrowLeft className="cart-icon" />
              Continue Shopping
            </Link>
            <button onClick={ clearCart } className="cart-clear">
              Clear Cart
            </button>
          </div>
        </div>

        <div className="cart-summary">
          <h2>ORDER SUMMARY</h2>
          <div className="cart-summary-details">
            <div className="cart-summary-row">
              <span>Subtotal ({ itemCount } items)</span>
              <span>₱{ subtotal.toFixed(2) }</span>
            </div>
            { promoApplied && (
              <div className="cart-summary-row cart-discount">
                <span>Discount (10%)</span>
                <span>-₱{ discount.toFixed(2) }</span>
              </div>
            ) }
            <div className="cart-summary-row cart-total">
              <span>Total</span>
              <span>₱{ finalTotal.toFixed(2) }</span>
            </div>
            { isBelowMinimum && (
              <div className="cart-summary-row cart-warning">
                <span>Minimum order of ₱200 required</span>
              </div>
            ) }
          </div>

          <div className="cart-promo">
            <input
              type="text"
              value={ promoCode }
              onChange={ (e) => setPromoCode(e.target.value) }
              placeholder="Enter promo code"
              disabled={ promoApplied || isBelowMinimum }
              className="cart-promo-input"
            />
            <button
              onClick={ applyPromoCode }
              disabled={ promoApplied || !promoCode.trim() || isBelowMinimum }
              className={ `cart-promo-button ${promoApplied || isBelowMinimum ? 'disabled' : ''}` }
            >
              { promoApplied ? 'Applied' : 'Apply' }
            </button>
          </div>

          <button
            onClick={ handleCheckout }
            disabled={ isBelowMinimum }
            className={ `cart-checkout ${isBelowMinimum ? 'disabled' : ''}` }
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;
