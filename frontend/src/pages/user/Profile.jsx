import Footer from '@components/Footer.jsx';
import LoadingPage from '@components/LoadingPage';
import { OrderTimer, hasOrderExceededTimeout } from '@components/OrderTimer';
import useAuthStore from '@store/authStore';
import '@style/Profile.css';
import axios from 'axios';
import {
  AlertTriangle,
  Calendar,
  Camera,
  Coffee,
  CreditCard,
  Edit,
  History,
  MapPin,
  Star,
  UserCircle,
  UserCog,
  Wallet,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

const Profile = () => {
  const { userData, setError, clearMessages, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState('');
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showCurrentOrder, setShowCurrentOrder] = useState(false);
  const [profile, setProfile] = useState({
    username: userData?.username || '',
    fullname: '',
    email: '',
    role: userData?.role || 'customer',
    status: 'active',
    firstname: '',
    middlename: '',
    lastname: '',
    phone: '',
    address: '',
    zipcode: '',
    loyalty_points: 0,
    loyalty_points_used: 0,
    profileicon: '',
    created_at: '',
    updated_at: '',
  });
  const [initialProfile, setInitialProfile] = useState(null);
  const [profileIconFile, setProfileIconFile] = useState(null);
  const [initialProfileIconFile, setInitialProfileIconFile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editOrderData, setEditOrderData] = useState({});
  const [initialEditOrderData, setInitialEditOrderData] = useState({}); // Store initial order data

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token || !userData?.user_id) {
        setError('No authentication token or user data found');
        setLocalError('Please log in to view your profile');
        window.location.href = '/';
        return;
      }

      const profileResponse = await axios.get('/api/core.php', {
        params: { action: 'fetch_user_details', user_id: userData.user_id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (!profileResponse.data.success) {
        throw new Error(profileResponse.data.message || 'Failed to fetch profile');
      }

      const userDataResponse = profileResponse.data.data.profile;
      if (!userDataResponse) {
        throw new Error('User profile does not exist');
      }

      const newProfile = {
        username: userDataResponse.username || '',
        email: userDataResponse.email || '',
        fullname: userDataResponse.fullname || '',
        role: userDataResponse.role || 'customer',
        status: userDataResponse.status || 'active',
        firstname: userDataResponse.firstname || '',
        middlename: userDataResponse.middlename || '',
        lastname: userDataResponse.lastname || '',
        phone: userDataResponse.phone || '',
        address: userDataResponse.address || '',
        zipcode: userDataResponse.zipcode || '',
        loyalty_points: parseInt(userDataResponse.loyalty_points) || 0,
        loyalty_points_used: parseInt(userDataResponse.loyalty_points_used) || 0,
        profileicon: userDataResponse.profileicon
          ? `/api/serve_image.php?type=profile&image=${encodeURIComponent(
            userDataResponse.profileicon.split('/').pop()
          )}`
          : 'https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava3.webp',
        created_at: userDataResponse.created_at || '',
        updated_at: userDataResponse.updated_at || '',
      };

      setProfile(newProfile);
      setInitialProfile(newProfile);
      setInitialProfileIconFile(null);

      const ordersResponse = await axios.get('/api/core.php', {
        params: { action: 'fetch_user_orders', user_id: userData.user_id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (ordersResponse.data.success) {
        setOrders(ordersResponse.data.data.orders || []);
      } else {
        setLocalError(ordersResponse.data.message || 'USER ORDER NOT FOUND');
      }
    } catch (err) {
      console.error('Profile data fetch error:', err);
      if (err.message === 'User profile does not exist') {
        Swal.fire({
          icon: 'error',
          title: 'Profile Not Found',
          text: 'User profile does not exist. Please create a profile or log in again.',
          timer: 3000,
          showConfirmButton: false,
        }).then(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('customer');
          window.location.href = '/';
        });
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setLocalError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        window.location.href = '/';
      } else {
        const errorMessage =
          err.response?.data?.message || 'Failed to load profile data';
        setError(errorMessage);
        setLocalError(errorMessage);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userData, setError]);

  useEffect(() => {
    if (userData?.user_id) {
      fetchProfileData();
    }
  }, [userData, fetchProfileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    clearMessages();
    setLocalError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setLocalError('Profile icon must be an image (e.g., PNG, JPG)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setLocalError('Profile icon file size must be under 2MB');
        return;
      }
      setProfileIconFile(file);
      setProfile((prev) => ({
        ...prev,
        profileicon: URL.createObjectURL(file),
      }));
      clearMessages();
      setLocalError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearMessages();
    setLocalError('');

    const hasProfileChanges = initialProfile && Object.keys(profile).some(
      (key) => profile[key] !== initialProfile[key]
    );
    const hasProfileIconChanges = profileIconFile !== initialProfileIconFile;

    if (!hasProfileChanges && !hasProfileIconChanges) {
      setIsSubmitting(false);
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to your profile.',
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        setLocalError('Please log in to update your profile');
        window.location.href = '/';
        return;
      }

      const fullname = `${profile.firstname} ${profile.middlename ? profile.middlename + ' ' : ''
        }${profile.lastname}`.trim();

      const formData = new FormData();
      formData.append('user_id', userData.user_id);
      formData.append('username', profile.username);
      formData.append('email', profile.email);
      formData.append('fullname', fullname);
      formData.append('role', profile.role);
      formData.append('status', profile.status);
      formData.append('firstname', profile.firstname);
      formData.append('middlename', profile.middlename || '');
      formData.append('lastname', profile.lastname);
      formData.append('phone', profile.phone);
      formData.append('address', profile.address);
      formData.append('zipcode', profile.zipcode);
      if (profileIconFile) {
        formData.append('profileicon', profileIconFile);
      }

      const response = await axios.post(
        '/api/core.php?action=update_user',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        }
      );

      const updatedData = response.data.data || {};
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Profile updated successfully!',
        timer: 1500,
        showConfirmButton: false,
      });

      setProfile((prev) => ({
        ...prev,
        username: updatedData.username || prev.username,
        firstname: updatedData.firstname || prev.firstname,
        middlename: updatedData.middlename || prev.middlename,
        lastname: updatedData.lastname || prev.lastname,
        email: updatedData.email || prev.email,
        phone: updatedData.phone || prev.phone,
        address: updatedData.address || prev.address,
        zipcode: updatedData.zipcode || prev.zipcode,
        loyalty_points: parseInt(updatedData.loyalty_points) || prev.loyalty_points,
        loyalty_points_used:
          parseInt(updatedData.loyalty_points_used) || prev.loyalty_points_used,
        profileicon: updatedData.profileicon
          ? `/api/serve_image.php?type=profile&image=${encodeURIComponent(
            updatedData.profileicon.split('/').pop()
          )}`
          : prev.profileicon,
        created_at: updatedData.created_at || prev.created_at,
        updated_at: updatedData.updated_at || prev.updated_at,
      }));

      setProfileIconFile(null);
      setInitialProfileIconFile(null);
      setInitialProfile(profile);

      const updatedUser = {
        ...userData,
        username: updatedData.username || profile.username,
        email: updatedData.email || profile.email,
        full_name: `${updatedData.firstname || profile.firstname
          } ${updatedData.lastname || profile.lastname}`,
      };
      localStorage.setItem('customer', JSON.stringify(updatedUser));
      setAuth(updatedUser, token);

      setIsEditing(false);
    } catch (err) {
      console.error('Profile update error:', err);
      let errorMessage =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED'
          ? 'Request timed out. Please try again.'
          : err.message || 'Failed to update profile');

      if (err.response?.status === 409) {
        errorMessage =
          'Username or email already exists. Please choose a different one.';
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setLocalError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        window.location.href = '/';
        return;
      } else if (
        err.response?.status === 400 &&
        errorMessage.includes('Invalid profile icon')
      ) {
        errorMessage = 'Invalid profile icon file. Please upload a valid image.';
      }

      setError(errorMessage);
      setLocalError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        timer: 2000,
        showConfirmButton: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrderChange = (e) => {
    const { name, value } = e.target;
    setEditOrderData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditOrderSubmit = async (e) => {
    e.preventDefault();

    // Check for changes
    const hasOrderChanges = initialEditOrderData && Object.keys(editOrderData).some(
      (key) => editOrderData[key] !== initialEditOrderData[key]
    );

    if (!hasOrderChanges) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to the order.',
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/CustomerOrder/CustomerOrder.php?action=update_order', {
        order_id: editOrderData.order_id,
        payment_method: editOrderData.payment_method,
        delivery_firstname: editOrderData.delivery_firstname,
        delivery_lastname: editOrderData.delivery_lastname,
        delivery_phone: editOrderData.delivery_phone,
        delivery_email: editOrderData.delivery_email,
        delivery_address: editOrderData.delivery_address,
        delivery_city: editOrderData.delivery_city,
        delivery_zipcode: editOrderData.delivery_zipcode,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setShowEditOrder(false);
        setEditOrderData({});
        setInitialEditOrderData({});
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Order updated successfully!',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchProfileData();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.data.message || 'Failed to update order',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error('Update order error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update order',
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handleDeleteOrder = async () => {
    if (!editOrderData.order_id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/CustomerOrder/CustomerOrder.php?action=delete_order', {
        order_id: editOrderData.order_id,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setEditOrderData({});
        setInitialEditOrderData({});
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Order deleted successfully!',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchProfileData();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res.data.message || 'Failed to delete order',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error('Delete order error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to delete order',
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handleImageClick = () => {
    if (isEditing && !isSubmitting) {
      fileInputRef.current.click();
    }
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    setShowOrderHistory(false);
    setShowCurrentOrder(true);
  };

  const handleOrderHistoryClick = (e) => {
    e.preventDefault();
    setShowOrderHistory(true);
    setShowCurrentOrder(false);
  };

  const isWithin15Minutes = (createdAt) => {
    if (!createdAt) return false;
    const orderTime = new Date(createdAt).getTime();
    const currentTime = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    return currentTime - orderTime <= fifteenMinutes;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prevOrders) => [...prevOrders]);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="profile-container">
      <div>
        <nav className="profile-breadcrumb" aria-label="breadcrumb">
          <div className="profile-breadcrumb-content">
            <span className="profile-emoji">☕</span>
            <span className="profile-title">My Profile</span>
            <span className="profile-emoji">☕</span>
          </div>
        </nav>

        <div className="profile-grid">
          <div className="profile-left-column">
            <div className="profile-card profile-sticky">
              <div className="profile-card-body">
                <div className="profile-image-container">
                  <div className="profile-image-wrapper">
                    <img
                      src={ profile.profileicon }
                      alt={ `${profile.firstname} ${profile.lastname}'s profile icon` }
                      className="profile-image"
                      onClick={ handleImageClick }
                      style={ { cursor: isEditing && !isSubmitting ? 'pointer' : 'default' } }
                    />
                    { isEditing && !isSubmitting && (
                      <div className="profile-image-edit">
                        <Camera size={ 16 } />
                      </div>
                    ) }
                  </div>
                  <input
                    type="file"
                    name="profileicon"
                    ref={ fileInputRef }
                    onChange={ handleFileChange }
                    className="profile-file-input"
                    disabled={ !isEditing || isSubmitting }
                    accept="image/*"
                    aria-label="Upload profile image"
                  />
                </div>
                <h3 className="profile-section-title">{ profile.firstname } { profile.lastname }</h3>
                <p className="profile-text">
                  <UserCircle className="profile-icon-small" />
                  Coffee Lover
                </p>
                <p className="profile-text">
                  <MapPin className="profile-icon-small" />
                  { profile.city ? `${profile.city}, ` : '' }{ profile.address || 'Philippines' }
                </p>
                <div className="profile-loyalty-badge">
                  <Star className="profile-icon-small" />
                  { profile.loyalty_points } Loyalty Points
                </div>
              </div>
            </div>
          </div>

          <div className="profile-right-column">
            <div className="profile-header-toggle" role="tablist">
              <button
                className={ `profile-btn-toggle ${!showOrderHistory && !showCurrentOrder ? 'profile-btn-toggle-active' : ''}` }
                onClick={ () => {
                  setShowOrderHistory(false);
                  setShowCurrentOrder(false);
                } }
                role="tab"
                aria-selected={ !showOrderHistory && !showCurrentOrder }
                aria-controls="profile-info"
              >
                <UserCog className="profile-icon-small" /> Profile Information
              </button>
              <button
                className={ `profile-btn-toggle ${showCurrentOrder ? 'profile-btn-toggle-active' : ''}` }
                onClick={ handleProfileClick }
                role="tab"
                aria-selected={ showCurrentOrder }
                aria-controls="current-order"
              >
                <Wallet className="profile-icon-small" /> Current Order
              </button>
              <button
                className={ `profile-btn-toggle ${showOrderHistory ? 'profile-btn-toggle-active' : ''}` }
                onClick={ handleOrderHistoryClick }
                role="tab"
                aria-selected={ showOrderHistory }
                aria-controls="order-history"
              >
                <History className="profile-icon-small" /> Order History
              </button>
            </div>
            <div className="profile-card">
              <div className="profile-card-body">
                { error && (
                  <div className="profile-alert" role="alert">
                    <AlertTriangle className="profile-icon-small" />
                    { error }
                  </div>
                ) }

                { !showOrderHistory && !showCurrentOrder ? (
                  <div id="profile-info" role="tabpanel">
                    <div className="profile-section-header">
                      <UserCog className="profile-icon-small" />
                      <h2 className="profile-section-title">Profile Information</h2>
                    </div>
                    <div className="profile-details-grid">
                      <div className="profile-detail-item">
                        <UserCircle className="profile-icon" />
                        <div>
                          <label className="profile-label">Full Name</label>
                          <p className="profile-text">
                            { profile.firstname || profile.middlename || profile.lastname
                              ? `${profile.firstname || ""} ${profile.middlename || ""} ${profile.lastname || ""}`.trim()
                              : "Not set" }
                          </p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <MapPin className="profile-icon" />
                        <div>
                          <label className="profile-label">Email</label>
                          <p className="profile-text">{ profile.email || 'Not set' }</p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <MapPin className="profile-icon" />
                        <div>
                          <label className="profile-label">Phone</label>
                          <p className="profile-text">{ profile.phone || 'Not set' }</p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <MapPin className="profile-icon" />
                        <div>
                          <label className="profile-label">Address</label>
                          <p className="profile-text">{ profile.address || 'Not set' }</p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <MapPin className="profile-icon" />
                        <div>
                          <label className="profile-label">Zipcode</label>
                          <p className="profile-text">{ profile.zipcode || 'Not set' }</p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <Coffee className="profile-icon" />
                        <div>
                          <label className="profile-label">Loyalty Points</label>
                          <p className="profile-text">{ profile.loyalty_points } points</p>
                        </div>
                      </div>
                      <div className="profile-detail-item">
                        <Calendar className="profile-icon" />
                        <div>
                          <label className="profile-label">Member Since</label>
                          <p className="profile-text">{ formatDate(profile.created_at) }</p>
                        </div>
                      </div>
                      <div className="profile-button-container">
                        <button
                          type="button"
                          className="profile-btn"
                          onClick={ () => {
                            setIsEditing(!isEditing);
                            setLocalError('');
                            if (!isEditing) setProfileIconFile(null);
                          } }
                          disabled={ isSubmitting }
                          aria-label={ isEditing ? 'Cancel editing profile' : 'Edit profile' }
                        >
                          { isEditing ? <X className="profile-icon-small" /> : <Edit className="profile-icon-small" /> }
                          { isEditing ? 'Cancel' : 'Edit Profile' }
                        </button>
                      </div>
                    </div>
                  </div>
                ) : showCurrentOrder ? (
                  <div id="current-order" role="tabpanel">
                    <div className="profile-section-header">
                      <Wallet className="profile-icon-small" />
                      <h2 className="profile-section-title">Current Order</h2>
                    </div>
                    { orders.filter(
                      (order) =>
                        (order.status === 'Pending' || isWithin15Minutes(order.created_at)) &&
                        !hasOrderExceededTimeout(order.created_at) &&
                        !['Completed', 'Cancelled', 'Refund', 'Failed Delivery', 'Returned'].includes(order.status)
                    ).length > 0 ? (
                      <div className="profile-orders-grid">
                        { orders
                          .filter(
                            (order) =>
                              (order.status === 'Pending' || isWithin15Minutes(order.created_at)) &&
                              !hasOrderExceededTimeout(order.created_at) &&
                              !['Completed', 'Cancelled', 'Refund', 'Failed Delivery', 'Returned'].includes(order.status)
                          )
                          .map((order) => (
                            <div key={ order.order_id } className="profile-order-item">
                              <div className="profile-order-card">
                                <div className='profile-order-card-body'>
                                  <div className="profile-cardorder-text"><strong>Order #:</strong> { order.order_number }</div>
                                  <div className="profile-cardorder-text">
                                    <strong>Status:</strong>
                                    <span className={ `profile-order-status status-${order.status.toLowerCase().replace(' ', '-')}` }>
                                      { order.status }
                                    </span>
                                    <OrderTimer createdAt={ order.created_at } orderStatus={ order.status } />
                                  </div>
                                  <div className="profile-cardorder-text"><strong>Total:</strong> { formatCurrency(order.total_amount) }</div>
                                  <div className="profile-cardorder-text"><strong>Payment:</strong> { order.payment_method }</div>
                                  { order.payment_method === 'GCash' && (
                                    <div className="profile-cardorder-text">
                                      <strong>GCash Reference:</strong> { order.payment_reference }
                                    </div>
                                  ) }
                                  <div className="profile-cardorder-text">
                                    <strong>Delivery:</strong> { order.delivery_address }, { order.delivery_city } { order.delivery_zipcode }
                                  </div>
                                  <div className="profile-cardorder-text"><strong>Contact:</strong> { order.delivery_phone }</div>
                                </div>
                                <div className="profile-order-actions">
                                  { order.status !== 'Pending' && (
                                    <small className="profile-order-note">
                                      Order cannot be modified at this stage
                                    </small>
                                  ) }
                                  { order.status === 'Pending' && (
                                    <>
                                      <button
                                        className="profile-btn"
                                        onClick={ () => {
                                          setEditOrderData({
                                            order_id: order.order_id,
                                            payment_method: order.payment_method,
                                            delivery_firstname: order.delivery_firstname,
                                            delivery_lastname: order.delivery_lastname,
                                            delivery_phone: order.delivery_phone,
                                            delivery_email: order.delivery_email,
                                            delivery_address: order.delivery_address,
                                            delivery_city: order.delivery_city,
                                            delivery_zipcode: order.delivery_zipcode,
                                          });
                                          setInitialEditOrderData({
                                            order_id: order.order_id,
                                            payment_method: order.payment_method,
                                            delivery_firstname: order.delivery_firstname,
                                            delivery_lastname: order.delivery_lastname,
                                            delivery_phone: order.delivery_phone,
                                            delivery_email: order.delivery_email,
                                            delivery_address: order.delivery_address,
                                            delivery_city: order.delivery_city,
                                            delivery_zipcode: order.delivery_zipcode,
                                          });
                                          setShowEditOrder(true);
                                        } }
                                        aria-label={ `Edit order ${order.order_number}` }
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="profile-btn profile-btn-cancel"
                                        onClick={ async () => {
                                          setEditOrderData({ order_id: order.order_id });
                                          const result = await Swal.fire({
                                            title: 'Are you sure?',
                                            text: 'Do you want to delete this order? This action cannot be undone.',
                                            icon: 'warning',
                                            showCancelButton: true,
                                            confirmButtonColor: '#d33',
                                            cancelButtonColor: '#3085d6',
                                            confirmButtonText: 'Yes, delete it!',
                                          });
                                          if (result.isConfirmed) {
                                            handleDeleteOrder();
                                          }
                                        } }
                                        aria-label={ `Delete order ${order.order_number}` }
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) }
                                </div>
                              </div>
                            </div>
                          )) }
                      </div>
                    ) : (
                      <div className="profile-empty-state">
                        <Wallet className="profile-icon-large" />
                        <p className="profile-text profile-text-large">No current orders</p>
                        <p className="profile-text-muted">You don't have any pending orders at the moment.</p>
                      </div>
                    ) }
                  </div>
                ) : (
                  <div id="order-history" role="tabpanel">
                    <div className="profile-section-header">
                      <History className="profile-icon-small" />
                      <h2 className="profile-section-title">Order History</h2>
                    </div>
                    { orders.length === 0 ? (
                      <div className="profile-empty-state">
                        <Coffee className="profile-icon-large" />
                        <p className="profile-text profile-text-large">No orders found</p>
                        <p className="profile-text-muted">Start your coffee journey with us!</p>
                      </div>
                    ) : (
                      <div className="profile-orders-grid">
                        { orders.map((order) => (
                          <div key={ order.order_id } className="profile-order-item">
                            <div className="profile-history-card">
                              <div className="profile-history-card-body">
                                <div className="profile-history-header">
                                  <div>
                                    <h6 className="profile-section-title">Order #{ order.order_number }</h6>
                                    <small className="profile-text-muted">
                                      <Calendar className="profile-icon-small" />
                                      { formatDate(order.created_at) }
                                    </small>
                                  </div>
                                  <span
                                    className={ `profile-order-status profile-order-status-${order.status.toLowerCase().replace(/\s+/g, '-')}` }
                                  >
                                    { order.status }
                                  </span>
                                </div>
                                <div className="profile-history-content">
                                  <div>
                                    <p className="profile-text">
                                      <Wallet className="profile-icon-small" />
                                      <strong>{ formatCurrency(order.total_amount) }</strong>
                                    </p>
                                    <p className="profile-text">
                                      <CreditCard className="profile-icon-small" />
                                      { order.payment_method }
                                    </p>
                                  </div>
                                  <Coffee className="profile-coffee-cup" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )) }
                      </div>
                    ) }
                  </div>
                ) }
              </div>
            </div>
          </div>
        </div>

        { showEditOrder && (
          <div className="profile-modal-backdrop" onClick={ () => setShowEditOrder(false) }>
            <div className="profile-modal" onClick={ (e) => e.stopPropagation() }>
              <div className="profile-modal-header">
                <h5 className="profile-modal-title">Edit Order Information</h5>
                <button
                  className="profile-close-btn"
                  onClick={ () => setShowEditOrder(false) }
                  aria-label="Close edit order modal"
                >
                  &times;
                </button>
              </div>
              <form className="profile-modal-form" onSubmit={ handleEditOrderSubmit } autoComplete="off">
                <div className="profile-modal-body">
                  <div className="profile-form-grid-sm">
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-firstname">First Name</label>
                      <input
                        type="text"
                        id="delivery-firstname"
                        name="delivery_firstname"
                        value={ editOrderData.delivery_firstname || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        placeholder="Enter first name"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-lastname">Last Name</label>
                      <input
                        type="text"
                        id="delivery-lastname"
                        name="delivery_lastname"
                        value={ editOrderData.delivery_lastname || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        placeholder="Enter last name"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-phone">Phone Number</label>
                      <input
                        type="tel"
                        id="delivery-phone"
                        name="delivery_phone"
                        value={ editOrderData.delivery_phone || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        placeholder="Enter phone number"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-email">Email</label>
                      <input
                        type="email"
                        id="delivery-email"
                        name="delivery_email"
                        value={ editOrderData.delivery_email || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        placeholder="Enter email address"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-city">City</label>
                      <select
                        id="delivery-city"
                        name="delivery_city"
                        value={ editOrderData.delivery_city || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        required
                        aria-required="true"
                      >
                        <option value="">Select City</option>
                        <option value="Carcar">Carcar</option>
                      </select>
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="payment-method">Payment Method</label>
                      <input
                        id="payment-method"
                        type="text"
                        name="payment_method"
                        value={ editOrderData.payment_method || '' }
                        className="profile-input-readonly"
                        readOnly
                        aria-readonly="true"
                      />
                    </div>
                    <div className="profile-form-full-width">
                      <label className="profile-form-label" htmlFor="delivery-address">Delivery Address</label>
                      <textarea
                        id="delivery-address"
                        name="delivery_address"
                        value={ editOrderData.delivery_address || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input profile-textarea"
                        placeholder="Enter complete delivery address"
                        rows="3"
                        required
                        aria-required="true"
                      />
                    </div>
                    <div>
                      <label className="profile-form-label" htmlFor="delivery-zipcode">ZIP Code</label>
                      <input
                        id="delivery-zipcode"
                        type="text"
                        name="delivery_zipcode"
                        value={ editOrderData.delivery_zipcode || '' }
                        onChange={ handleEditOrderChange }
                        className="profile-input"
                        placeholder="Enter ZIP code"
                        required
                        aria-required="true"
                      />
                    </div>
                  </div>
                </div>
                <div className="profile-modal-footer">
                  <button
                    type="submit"
                    className="profile-btn"
                    aria-label="Save order changes"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="profile-btn profile-btn-cancel"
                    onClick={ () => setShowEditOrder(false) }
                    aria-label="Cancel order edit"
                  >
                    Cancel
                  </button>

                </div>
              </form>
            </div>
          </div>
        ) }

        { isEditing && (
          <div className="profile-form-overlay" onClick={ () => {
            setIsEditing(false);
            setLocalError('');
            setProfileIconFile(null);
            fetchProfileData();
          } }>
            <div className="profile-form-modal-custom" onClick={ (e) => e.stopPropagation() }>
              <div className="profile-form-grid">
                <div className="profile-form-summary">
                  <img
                    src={ profile.profileicon }
                    alt={ `${profile.firstname} ${profile.lastname}'s profile icon` }
                    className="profile-image"
                    onClick={ handleImageClick }
                    style={ { cursor: !isSubmitting ? 'pointer' : 'default' } }
                  />
                  <input
                    type="file"
                    name="profileicon"
                    ref={ fileInputRef }
                    onChange={ handleFileChange }
                    className="profile-file-input"
                    disabled={ isSubmitting }
                    accept="image/*"
                    aria-label="Upload profile image"
                  />
                  <h3 className="profile-section-title">{ profile.firstname } { profile.lastname }</h3>
                  <div className="profile-text">{ profile.username }</div>
                  <div className="profile-text">{ profile.address || 'Philippines' }</div>
                  <div className="profile-text">{ profile.city || '' }</div>
                </div>
                <div className="profile-form-fields">
                  <div className="profile-form-header">
                    <span
                      className="profile-form-back"
                      onClick={ () => setIsEditing(false) }
                      role="button"
                      aria-label="Back to profile"
                    >
                      &larr; Back
                    </span>
                    <span className="profile-form-edit-title">Edit Profile</span>
                  </div>
                  <form className="profile-form" onSubmit={ handleSubmit } autoComplete="off">
                    <div className="profile-form-grid-sm">
                      <div>
                        <label htmlFor="profile-firstname" className="profile-form-label">First Name</label>
                        <input
                          id="profile-firstname"
                          type="text"
                          name="firstname"
                          className="profile-input"
                          placeholder="First Name"
                          value={ profile.firstname }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-lastname" className="profile-form-label">Last Name</label>
                        <input
                          id="profile-lastname"
                          type="text"
                          name="lastname"
                          className="profile-input"
                          placeholder="Last Name"
                          value={ profile.lastname }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-username" className="profile-form-label">Username</label>
                        <input
                          id="profile-username"
                          type="text"
                          name="username"
                          className="profile-input"
                          placeholder="Username"
                          value={ profile.username }
                          onChange={ handleChange }
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-email" className="profile-form-label">Email</label>
                        <input
                          id="profile-email"
                          type="email"
                          name="email"
                          className="profile-input"
                          placeholder="Email"
                          value={ profile.email }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-phone" className="profile-form-label">Phone Number</label>
                        <input
                          id="profile-phone"
                          type="tel"
                          name="phone"
                          className="profile-input"
                          placeholder="Phone Number"
                          value={ profile.phone }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                          required
                          aria-required="true"
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-address" className="profile-form-label">Address</label>
                        <input
                          id="profile-address"
                          type="text"
                          name="address"
                          className="profile-input"
                          placeholder="Address"
                          value={ profile.address }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                        />
                      </div>
                      <div>
                        <label htmlFor="profile-zipcode" className="profile-form-label">Zipcode</label>
                        <input
                          id="profile-zipcode"
                          type="text"
                          name="zipcode"
                          className="profile-input"
                          placeholder="Zipcode"
                          value={ profile.zipcode }
                          onChange={ handleChange }
                          disabled={ isSubmitting }
                        />
                      </div>
                    </div>
                    <div className="profile-button-container">
                      <button
                        type="submit"
                        className="profile-btn"
                        disabled={ isSubmitting }
                        aria-label="Save profile changes"
                      >
                        Save Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) }
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
