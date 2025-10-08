import LoadingPage from '@components/LoadingPage';
import useProductStore from '@store/useProductStore';
import '@style/Checkout.css';
import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coffee,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Star,
  Store,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotals, getProductById, clearCart, fetchProducts, products } = useProductStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Carcar',
    zipCode: '',
    paymentMethod: 'GCash',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const { subtotal } = getCartTotals();
  const [discount, setDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');

  const user = JSON.parse(localStorage.getItem('customer'));
  const user_id = user?.user_id || null;

  // Fetch products if not loaded to ensure accurate coffee detection
  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products.length, fetchProducts]);

  const getCheapestCoffeePrice = useCallback(() => {
    const coffeeTypes = ['coffee', 'hot', 'latte', 'espresso', 'cappuccino'];
    const coffeeItems = cartItems.filter((item) => {
      const product = getProductById(parseInt(item.id));
      if (!product) return false; // Skip if product not loaded
      const productType = (product.type || '').toLowerCase();
      const productName = (product.name || '').toLowerCase();
      return coffeeTypes.some(
        (type) => productType.includes(type) || productName.includes(type)
      );
    });

    const prices = coffeeItems.map((item) => parseFloat(item.price) || 0).filter((price) => price > 0);

    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [cartItems, getProductById]);



  const loyaltyCoffeePrice = getCheapestCoffeePrice();
  const shipping = 0;
  const hasFreeCoffee = useLoyaltyPoints && loyaltyPoints >= 100 && loyaltyCoffeePrice > 0;
  const promoDiscountValue = discount > 0 ? discount : 0;
  const totalDiscount = Number(promoDiscountValue.toFixed(2));
  const discountedSubtotal = subtotal - totalDiscount;
  const finalTotal = Number((discountedSubtotal + shipping).toFixed(2));
  // Points are now based on total checkout cost: 1 point per ₱10 of final total
  const pointsToEarn = Math.floor(finalTotal / 10);

  useEffect(() => {
    const fetchLoyaltyPoints = async () => {
      if (user_id) {
        try {
          const response = await axios.get('/api/core.php?action=check-auth', {
            headers: { Authorization: `Bearer ${user?.token}` },
          });

          if (response.data.success) {
            setLoyaltyPoints(parseInt(response.data.user.loyalty_points) || 0);
          }
        } catch (e) {
          if (e.response?.status === 401) {
            localStorage.removeItem('customer');
            Swal.fire({
              icon: 'error',
              title: 'Session Expired',
              text: 'Your session has expired. Please log in again.',
            }).then(() => {
              navigate('/');
            });
          } else {
            setError('Error fetching loyalty points');
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to fetch loyalty points. Please try again.',
            });
          }
        }
      }
    };

    fetchLoyaltyPoints();

    const saved = localStorage.getItem('checkoutFormData');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsedData, city: 'Carcar' }));
      } catch (e) {
        console.error('Failed to parse saved form data', e);
      }
    }

    const savedDiscount = localStorage.getItem('cartDiscount');
    if (savedDiscount) {
      try {
        const { applied, amount, code } = JSON.parse(savedDiscount);
        if (applied) {
          setDiscount(Number(amount.toFixed(2)));
          setPromoCode(code);
        }
      } catch (e) {
        console.error('Failed to parse saved discount data', e);
      }
    }
  }, [user_id, user?.token, navigate]);

  useEffect(() => {
    localStorage.setItem('checkoutFormData', JSON.stringify(formData));
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReferenceChange = (e) => {
    setPaymentReference(e.target.value);
  };

  const handleLoyaltyToggle = () => {
    if (loyaltyPoints < 100) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Points',
        text: 'You need at least 100 loyalty points to redeem one free coffee.',
      });
      return;
    }

    setUseLoyaltyPoints(!useLoyaltyPoints);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const fields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zipCode'];
      const missingFields = fields.filter((field) => !formData[field]);

      if (missingFields.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Information',
          text: `Please fill in all fields: ${missingFields.join(', ')}`,
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      // Validate firstName and lastName (no numbers)
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(formData.firstName)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid First Name',
          text: 'First name should not contain numbers.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }
      if (!nameRegex.test(formData.lastName)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Last Name',
          text: 'Last name should not contain numbers.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      // Validate email (must end with @gmail.com)
      if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Email',
          text: 'Email must be a valid Gmail address ending with @gmail.com.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      // Validate zipCode (must be numeric)
      const zipCodeRegex = /^\d+$/;
      if (!zipCodeRegex.test(formData.zipCode)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid ZIP Code',
          text: 'ZIP code must contain only numbers.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }
      if (!zipCodeRegex.test(formData.phone)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: 'Phone Number must contain only numbers.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      if (formData.paymentMethod === 'GCash' && !paymentReference.trim()) {
        Swal.fire({
          icon: 'error',
          title: 'Payment Reference Required',
          text: 'Please enter your GCash payment reference number for verification.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      // Validate GCash reference number (must be 13 digits)
      if (formData.paymentMethod === 'GCash') {
        const gcashRefRegex = /^\d{13}$/;
        if (!gcashRefRegex.test(paymentReference.trim())) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid GCash Reference',
            text: 'GCash reference number must be exactly 13 digits.',
          });
          setIsSubmitting(false);
          setIsLoading(false);
          return;
        }
      }

      const validSizes = ['small', 'medium', 'large'];
      const invalidItems = cartItems.filter(
        (item) => !validSizes.includes((item.size || 'medium').toLowerCase())
      );
      if (invalidItems.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Cart Items',
          text: `Some items have invalid sizes. Valid sizes are: ${validSizes.join(', ')}`,
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      if (cartItems.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Empty Cart',
          text: 'Your cart is empty. Please add items to proceed.',
        });
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      if (useLoyaltyPoints && loyaltyPoints < 100) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Loyalty Redemption',
          text: 'You need at least 100 loyalty points to redeem a free coffee.',
        });
        setUseLoyaltyPoints(false);
        setIsSubmitting(false);
        setIsLoading(false);
        return;
      }

      if (useLoyaltyPoints) {
        const confirm = await Swal.fire({
          icon: 'question',
          title: 'Confirm Loyalty Points Redemption',
          text: 'Redeem 100 points for one free coffee?',
          showCancelButton: true,
          confirmButtonText: 'Yes, Redeem',
          cancelButtonText: 'No',
        });
        if (!confirm.isConfirmed) {
          setIsSubmitting(false);
          setIsLoading(false);
          return;
        }
      }

      const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const paymentRef = formData.paymentMethod === 'GCash' && paymentReference.trim() ? paymentReference.trim() : null;

      const orderData = {
        user_id: user_id ? parseInt(user_id) : null,
        order_number: orderNumber,
        total_amount: finalTotal,
        payment_method: formData.paymentMethod,
        payment_reference: paymentRef,
        delivery_firstname: formData.firstName,
        delivery_lastname: formData.lastName,
        delivery_phone: formData.phone,
        delivery_email: formData.email,
        delivery_address: formData.address,
        delivery_city: formData.city,
        delivery_zipcode: formData.zipCode,
        discount_amount: totalDiscount,
        promo_code: promoCode || null,
        use_loyalty_points: useLoyaltyPoints,
        items: cartItems.map((item) => ({
          product_id: parseInt(item.id),
          quantity: parseInt(item.quantity),
          price: Number(parseFloat(item.price).toFixed(2)),
          size: (item.size || 'medium').toLowerCase(),
        })),
      };

      const response = await axios.post(
        '/api/core.php',
        { ...orderData, action: 'order_create' },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
          },
        }
      );

      if (response.data.success) {
        await clearCart();
        localStorage.removeItem('checkoutFormData');
        localStorage.removeItem('cartDiscount');

        const newOrder = {
          orderNumber,
          total: finalTotal,
          status: 'Pending',
          payment_method: formData.paymentMethod,
          items: cartItems,
          customer: formData,
          discount,
          promoCode,
          loyaltyPointsUsed: useLoyaltyPoints ? 100 : 0,
          hasFreeCoffee,
          loyalty_points_earned: response.data.points_earned || pointsToEarn,
        };

        setOrder(newOrder);

        if (response.data.loyalty_points !== undefined) {
          setLoyaltyPoints(parseInt(response.data.loyalty_points));
          setUseLoyaltyPoints(false);
        }

        let message = `Your order #${orderNumber} has been received`;
        if (response.data.low_stock_products?.length > 0) {
          message += '. Note: Some items are low in stock.';
        }
        if (discount > 0) {
          message += `\nPromo discount applied: ₱${parseFloat(discount).toFixed(2)}`;
        }
        if (useLoyaltyPoints) {
          message += `\nLoyalty points redeemed: 100 (One free coffee included)`;
        }
        const earnedPoints = response.data.points_earned !== undefined ? response.data.points_earned : pointsToEarn;
        if (earnedPoints > 0) {
          message += `\nEarned ${earnedPoints} loyalty point${earnedPoints > 1 ? 's' : ''} (1 point per ₱10 of total).`;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Order Placed!',
          text: message,
          confirmButtonText: 'View Order',
        });
      } else {
        throw new Error(response.data.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      let errorMessage = error.response?.data?.message || error.message || 'Failed to place order';
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: errorMessage,
        footer: 'Please try again or contact support if the problem persists.',
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleContinueShopping = () => {
    setOrder(null);
    navigate('/menu', { replace: true });
  };

  if (isLoading) {
    return <LoadingPage />
  }

  if (error) {
    return (
      <div className="order-confirmation-error" role="alert">
        <div className="order-error-container">
          <div className="order-error-icon">⚠️</div>
          <h1 className="order-error-title">Oops! Something went wrong</h1>
          <p className="order-error-message">{ error }</p>
          <button
            onClick={ () => {
              setError(null);
              navigate('/menu');
            } }
            className="order-error-button"
            aria-label="Browse menu"
          >
            <Coffee className="order-loading-icon" />
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      { order && (
        <div className="order-confirmation-overlay" onClick={ () => setOrder(null) }>
          <div className="order-confirmation-modal" onClick={ (e) => e.stopPropagation() } role="dialog" aria-labelledby="confirmation-title">
            <div className="confirmation-header">
              <div className="success-icon-container">
                <CheckCircle2 className="success-icon" aria-hidden="true" />
                <div className="success-glow"></div>
              </div>
              <h1 id="confirmation-title" className="confirmation-title">Order Confirmed!</h1>
              <p className="confirmation-subtitle">Thank you for your purchase</p>
              { order.loyalty_points_earned > 0 && (
                <div className="loyalty-badge">
                  <Star className="loyalty-icon" />
                  <span>You earned { order.loyalty_points_earned } loyalty points!</span>
                </div>
              ) }
            </div>

            <section className="order-details-section">
              <h2 className="section-title">Order Details</h2>
              <div className="details-grid">
                <div className="detail-card">
                  <p className="detail-label">Order Number</p>
                  <div className="detail-value">{ order.orderNumber?.slice(0, 15) }</div>
                </div>
                <div className="detail-card">
                  <p className="detail-label">Status</p>
                  <div className="detail-value">
                    <Clock className="order-loading-icon" aria-hidden="true" />
                    { order.status }
                  </div>
                </div>
                <div className="detail-card">
                  <p className="detail-label">Payment Method</p>
                  <div className="detail-value">
                    { order.payment_method === 'GCash' ? (
                      <CreditCard className="order-loading-icon" aria-hidden="true" />
                    ) : (
                      <Store className="order-loading-icon" aria-hidden="true" />
                    ) }
                    { order.payment_method === 'GCash' ? 'GCash Payment' : 'Pickup' }
                  </div>
                </div>
                { order.hasFreeCoffee && (
                  <div className="detail-card free-coffee-card">
                    <p className="detail-label">Loyalty Reward</p>
                    <div className="detail-value">
                      <span className="free-coffee-icon">🎁</span>
                      Free Coffee Included
                    </div>
                  </div>
                ) }
                <div className="detail-card total-card">
                  <p className="detail-label">Total Amount</p>
                  <div className="detail-value total-amount">
                    ₱{ parseFloat(order.total).toFixed(2) }
                  </div>
                </div>
              </div>
            </section>

            <section className="order-items-section">
              <h2 className="section-title">Order Items</h2>
              <div className="items-container">
                { order.items.map((item, index) => (
                  <div
                    className="order-item-card"
                    key={ `${item.id}-${item.size || 'medium'}-${index}` }
                  >
                    <div className="order-item-image-container">
                      <img
                        src={ `/api/serve_image.php?image=${encodeURIComponent(item.image || 'Isladelcafe.jpg')}&type=product` }
                        alt={ item.name }
                        className="order-item-image"
                        onError={ (e) => {
                          e.target.onerror = null;
                          e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                        } }
                      />
                    </div>
                    <div className="order-item-details">
                      <h4 className="order-item-name">{ item.name }</h4>
                      <p className="order-item-size">Size: { (item.size || 'medium').toLowerCase() }</p>
                      <p className="order-item-quantity">Quantity: { item.quantity }</p>
                    </div>
                    <div className="order-item-price">
                      ₱{ (parseFloat(item.price) * item.quantity).toFixed(2) }
                    </div>
                  </div>
                )) }
              </div>
            </section>

            <section className="delivery-section">
              <h2 className="section-title">Delivery Information</h2>
              <div className="delivery-info-container">
                <div className="info-row">
                  <div className="info-label">Customer Name</div>
                  <div className="info-value">
                    { order.customer.firstName } { order.customer.lastName }
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-label">Delivery Address</div>
                  <div className="info-value address-value">
                    <MapPin className="address-icon" aria-hidden="true" />
                    <div>
                      <p>{ order.customer.address }</p>
                      <p>{ order.customer.city }, { order.customer.zipCode }</p>
                    </div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-label">City</div>
                  <div className="info-value">Carcar City</div>
                </div>
                <div className="contact-info">
                  <div className="contact-item">
                    <Phone className="contact-icon" aria-hidden="true" />
                    <span>{ order.customer.phone }</span>
                  </div>
                  <div className="contact-item">
                    <Mail className="contact-icon" aria-hidden="true" />
                    <span>{ order.customer.email }</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="action-section">
              <button
                onClick={ handleContinueShopping }
                className="continue-shopping-btn"
                aria-label="Continue shopping"
              >
                <Coffee className="order-loading-icon" aria-hidden="true" />
                Continue Shopping
              </button>
              <p className="appreciation-text">We appreciate your business! ☕</p>
            </div>
          </div>
        </div>
      ) }

      <div className={ `checkout-content ${order ? 'blurred' : ''}` }>
        <button
          onClick={ () => navigate(-1) }
          className="back-button"
          aria-label="Back to cart"
        >
          <ArrowLeft size={ 16 } aria-hidden="true" />
          <span>Back to Cart</span>
        </button>

        <h1 className="checkout-title">Complete Your Order</h1>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            <h2 className="checkout-section-title">Order Summary</h2>
            <div className="order-summary-items">
              { cartItems.length === 0 ? (
                <p className="empty-cart-message">Your cart is currently empty.</p>
              ) : (
                cartItems.map((item, index) => (
                  <div
                    className="order-item-card"
                    key={ `${item.id}-${item.size || 'medium'}-${index}` }
                  >
                    <div className="order-item-image-container">
                      <img
                        src={ `/api/serve_image.php?image=${encodeURIComponent(item.image || 'Isladelcafe.jpg')}&type=product` }
                        alt={ item.name }
                        className="order-item-image"
                        onError={ (e) => {
                          e.target.onerror = null;
                          e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                        } }
                      />
                    </div>
                    <div className="order-item-details">
                      <h4 className="order-item-name">{ item.name }</h4>
                      <p className="order-item-size">Size: { (item.size || 'medium').toLowerCase() }</p>
                      <p className="order-item-quantity">Qty: { item.quantity }</p>
                    </div>
                    <div className="order-item-price">
                      ₱{ (parseFloat(item.price) * item.quantity).toFixed(2) }
                    </div>
                  </div>
                ))
              ) }
            </div>
            <div className="summary-totals">
              <div>
                <span>Subtotal</span>
                <span>₱{ parseFloat(subtotal).toFixed(2) }</span>
              </div>
              { discount > 0 && (
                <div>
                  <span>Discount (Promo)</span>
                  <span>-₱{ parseFloat(discount).toFixed(2) }</span>
                </div>
              ) }
              { hasFreeCoffee && (
                <div className="free-coffee-item">
                  <span>🎉 Free Coffee (Loyalty Reward)</span>
                  <span className="free-badge">FREE</span>
                </div>
              ) }
              <div>
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="total-line">
                <strong>Total</strong>
                <strong>₱{ finalTotal.toFixed(2) }</strong>
              </div>
              { user_id && (
                <div className="loyalty-points-container">
                  <div className="loyalty-points-header">
                    <Star className="loyalty-icon" aria-hidden="true" />
                    <span className="loyalty-title">Your Loyalty Points</span>
                  </div>
                  <div className="loyalty-points-content">
                    <div className="loyalty-points-balance">
                      <span>Balance</span>
                      <span className="points-value">{ loyaltyPoints } points</span>
                    </div>
                    <div className="loyalty-points-earn">
                      <span>You'll earn</span>
                      <span className="points-value">{ pointsToEarn } points</span>
                      <small className="coffee-note">(from coffee items only)</small>
                    </div>
                    <label className="loyalty-toggle">
                      <input
                        type="checkbox"
                        checked={ useLoyaltyPoints }
                        onChange={ handleLoyaltyToggle }
                        aria-label="Redeem 100 points for one free coffee"
                      />
                      <span>Redeem 100 points for one free coffee</span>
                      { loyaltyCoffeePrice > 0 && (
                        <span className="coffee-price">
                          (Worth ₱{ loyaltyCoffeePrice.toFixed(2) })
                        </span>
                      ) }
                    </label>
                  </div>
                </div>
              ) }
            </div>
          </div>

          <form onSubmit={ handleSubmit } className="checkout-form-section" autoComplete="off">
            <h2 className="checkout-section-title">Customer Information</h2>
            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  name="firstName"
                  value={ formData.firstName }
                  onChange={ handleChange }
                />
              </div>
              <div className="checkout-form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  name="lastName"
                  value={ formData.lastName }
                  onChange={ handleChange }
                />
              </div>
            </div>
            <div className="checkout-form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={ formData.email }
                onChange={ handleChange }
              />
            </div>
            <div className="checkout-form-group">
              <label htmlFor="phone">Phone *</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={ formData.phone }
                onChange={ handleChange }
              />
            </div>
            <div className="checkout-form-group">
              <label htmlFor="address">Address *</label>
              <textarea
                id="address"
                name="address"
                placeholder='Enter where in carcar....'
                rows="3"
                value={ formData.address }
                onChange={ handleChange }
              />
            </div>
            <div className="checkout-form-row">
              <div className="checkout-form-group">
                <label htmlFor="city">City *</label>
                <input
                  id="city"
                  type="text"
                  className='checkout-form-city'
                  name="city"
                  value={ formData.city }
                  readOnly
                  aria-readonly="true"
                />
                <small className="coffee-note">Delivery available only in Carcar</small>
              </div>
              <div className="checkout-form-group">
                <label htmlFor="zipCode">ZIP Code *</label>
                <input
                  id="zipCode"
                  name="zipCode"
                  value={ formData.zipCode }
                  onChange={ handleChange }
                />
              </div>
            </div>
            <div className="checkout-form-group">
              <label>Payment Method *</label>
              <div className="payment-options">
                <button
                  type="button"
                  className={ `payment-option ${formData.paymentMethod === 'GCash' ? 'selected' : ''}` }
                  onClick={ () => setFormData((prev) => ({ ...prev, paymentMethod: 'GCash' })) }
                  aria-label="Select GCash payment"
                >
                  <CreditCard className="icon" aria-hidden="true" />
                  GCash Payment
                </button>
                <button
                  type="button"
                  className={ `payment-option ${formData.paymentMethod === 'Pickup' ? 'selected' : ''}` }
                  onClick={ () => setFormData((prev) => ({ ...prev, paymentMethod: 'Pickup' })) }
                  aria-label="Select Pickup payment"
                >
                  <Store className="icon" aria-hidden="true" />
                  Pickup
                </button>
              </div>
            </div>
            { formData.paymentMethod === 'GCash' && (
              <div className="checkout-form-group">
                <label>Send Payment to this GCash Number:</label>
                <p className="checkout-gcashnumber">+63 975 188 3932</p>
                <label htmlFor="paymentReference">Payment Reference Number *</label>
                <input
                  id="paymentReference"
                  type="text"
                  name="paymentReference"
                  value={ paymentReference }
                  onChange={ handleReferenceChange }
                  placeholder="Enter your GCash payment reference number"
                  className="payment-reference-input"
                />
                <small className="coffee-note">
                  Please enter the 13-digit reference number from your GCash payment for verification
                </small>
              </div>
            ) }
            <button
              type="submit"
              className="submit-order"
              disabled={ isSubmitting }
              aria-label={ `Place order for ₱${finalTotal.toFixed(2)}` }
            >
              { isSubmitting ? (
                <div className="loading-spinner">
                  <span className="visually-hidden">Processing...</span>
                  Processing...
                </div>
              ) : (
                `Place Order (₱${finalTotal.toFixed(2)})`
              ) }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
