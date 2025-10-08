import LoadingPage from '@components/LoadingPage';
import useAuthStore from '@store/authStore'; //
import useOrderStore from '@store/useOrderStore';
import '@style/OrderDetails.css';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import PDFGenerator from './components/PdfGenerator';

function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const {
    order,
    orderItems,
    loading,
    loadingItems,
    updatingStatus,
    error,
    errorItems,
    fetchOrderDetails,
    fetchOrderItems,
    updateOrderStatus,
    deleteOrder,
  } = useOrderStore();

  const { userData } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Calculate paginated items
  const totalPages = Math.ceil((orderItems?.length || 0) / ITEMS_PER_PAGE);
  const paginatedItems = orderItems?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  ) || [];

  // Reset to page 1 if orderItems length changes
  useEffect(() => {
    if (orderItems?.length) {
      setCurrentPage(1);
    }
  }, [orderItems?.length]);

  // Fetch order details and items
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails(orderId);
      fetchOrderItems(orderId);
    }
  }, [orderId, fetchOrderDetails, fetchOrderItems]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error || 'Failed to load order details. Please try again.',
      });
    }
    if (errorItems) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorItems || 'Failed to load order items. Please try again.',
      });
    }
  }, [error, errorItems]);

  const getStatusColor = (status = '') => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'paid':
        return 'paid';
      case 'ready for pickup':
        return 'ready-for-pickup';
      case 'for delivery':
        return 'for-delivery';
      case 'delivered':
        return 'delivered';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'refund':
        return 'refund';
      default:
        return 'default';
    }
  };

  const getValidStatusOptions = (currentStatus = '') => {
    const validTransitions = {
      Pending: ['Confirmed', 'Cancelled'],
      Confirmed: ['Processing', 'Cancelled'],
      Processing: ['Ready for Pickup', 'Ready for Delivery', 'Cancelled'],
      'Ready for Pickup': ['Completed', 'Cancelled'],
      'Ready for Delivery': ['Out for Delivery', 'Cancelled'],
      'Out for Delivery': ['Delivered', 'Failed Delivery', 'Cancelled'],
      Delivered: ['Completed', 'Returned'],
      Completed: [],
      Refund: ['Completed'],
      Cancelled: [],
      'Failed Delivery': ['Out for Delivery', 'Cancelled'],
      Returned: ['Refund', 'Completed'],
    };
    return validTransitions[currentStatus] || [];
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteOrder(order.order_id);
      if (success) navigate('/orders');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !order) {
    return <LoadingPage />;
  }

  return (
    <div className="order-details-container-py-4">
      <div className="order-details-header">
        <h2 className="order-details-title">Order #{ order.order_number || 'N/A' }</h2>
        <div className="order-details-button-group">
          <button
            onClick={ () => navigate('/orders') }
            className="order-details-back-button"
            aria-label="Back to orders list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="order-details-back-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              style={ { width: '1.25rem', height: '1.25rem' } }
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z"
                clipRule="evenodd"
              />
            </svg>
            Back to Orders
          </button>
          <PDFGenerator order={ order } orderItems={ orderItems } />
        </div>
      </div>

      <div className="order-details-row">
        <div className="order-details-customer-col">
          <div className="order-details-customer-card">
            <div className="order-details-card-body">
              <h4 className="order-details-customer-title">Customer Information</h4>
              <div className="order-details-customer-info">
                <span className="order-details-label">Name:</span>
                <span className="order-details-value">
                  { order.first_name || '' } { order.last_name || '' }
                </span>
              </div>
              <div className="order-details-customer-info">
                <span className="order-details-label">Email:</span>
                <span className="order-details-value">{ order.email || 'N/A' }</span>
              </div>
              <div className="order-details-customer-info">
                <span className="order-details-label">Phone:</span>
                <span className="order-details-value">{ order.phone || 'N/A' }</span>
              </div>
              <div className="order-details-customer-info">
                <span className="order-details-label">Address:</span>
                <span className="order-details-value">
                  { order.address || '' }, { order.city || '' }, { order.zipcode || '' }
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="order-details-order-col">
          <div className="order-details-order-card">
            <div className="order-details-card-body">
              <h4 className="order-details-order-title">Order Information</h4>
              <div className="order-details-order-info">
                <span className="order-details-label">Status:</span>
                <span
                  className={ `order-details-status-badge order-details-status-${getStatusColor(
                    order.status
                  )}` }
                >
                  { order.status || 'N/A' }
                </span>
              </div>
              <div className="order-details-order-info">
                <span className="order-details-label">Date:</span>
                <span className="order-details-value">
                  { order.created_at
                    ? new Date(order.created_at).toLocaleString('en-US', {
                      timeZone: 'Asia/Manila',
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                    : 'N/A' }
                </span>
              </div>
              <div className="order-details-order-info">
                <span className="order-details-label">Payment:</span>
                <span className="order-details-value">{ order.payment_method || 'N/A' }</span>
              </div>
              <div className="order-details-order-info">
                <span className="order-details-label">Total:</span>
                <span className="order-details-total">
                  ₱{ parseFloat(order.total_amount || 0).toFixed(2) }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="order-details-items-card">
        <div className="order-details-items-body">
          <h4 className="order-details-items-title">Order Items</h4>
          { loadingItems ? (
            <div className="order-details-items-loading">
              <div className="order-details-spinner" role="status" aria-label="Loading order items">
                <span className="visually-hidden">Loading items...</span>
              </div>
            </div>
          ) : (
            <div className="order-details-table-container">
              <table className="order-details-table" role="grid">
                <thead className="order-details-table-header">
                  <tr>
                    <th scope="col" role="columnheader">
                      Product
                    </th>
                    <th scope="col" className="order-details-table-size" role="columnheader">
                      Size
                    </th>
                    <th scope="col" className="order-details-table-quantity" role="columnheader">
                      Quantity
                    </th>
                    <th scope="col" className="order-details-table-price" role="columnheader">
                      Price
                    </th>
                    <th scope="col" className="order-details-table-subtotal" role="columnheader">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  { paginatedItems.length > 0 ? (
                    paginatedItems.map((item, index) => (
                      <tr key={ `${item.product_id || `item-${index}`}-${index}-${currentPage}` }>
                        <td data-label="Product">{ item.product_name || 'Unknown' }</td>
                        <td data-label="Size" className="order-details-table-size">
                          { item.size || 'N/A' }
                        </td>
                        <td data-label="Quantity" className="order-details-table-quantity">
                          { item.quantity || 0 }
                        </td>
                        <td data-label="Price" className="order-details-table-price">
                          ₱{ parseFloat(item.price || 0).toFixed(2) }
                        </td>
                        <td data-label="Subtotal" className="order-details-table-subtotal">
                          ₱{ (parseFloat(item.price || 0) * (item.quantity || 0)).toFixed(2) }
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="order-details-table-empty">
                        No items found for this order
                      </td>
                    </tr>
                  ) }
                </tbody>
                { orderItems?.length > 0 && (
                  <tfoot>
                    <tr className="order-details-table-footer">
                      <td colSpan="4" className="order-details-table-total-label">
                        Total:
                      </td>
                      <td className="order-details-table-total">
                        ₱{ parseFloat(order.total_amount || 0).toFixed(2) }
                      </td>
                    </tr>
                  </tfoot>
                ) }
              </table>
              { orderItems?.length > ITEMS_PER_PAGE && (
                <div className="order-details-pagination">
                  <button
                    className="order-details-prev-button"
                    onClick={ () => setCurrentPage((p) => Math.max(1, p - 1)) }
                    disabled={ currentPage === 1 }
                    aria-label="Previous page of order items"
                  >
                    Previous
                  </button>
                  <span aria-live="polite">
                    Page { currentPage } of { totalPages }
                  </span>
                  <button
                    className="order-details-next-button"
                    onClick={ () => setCurrentPage((p) => Math.min(totalPages, p + 1)) }
                    disabled={ currentPage === totalPages }
                    aria-label="Next page of order items"
                  >
                    Next
                  </button>
                </div>
              ) }
            </div>
          ) }
        </div>
      </div>

      <div className="order-details-actions">
        <button
          onClick={ () => navigate('/orders') }
          className="order-details-back-button"
          aria-label="Back to orders list"
        >
          Back to Orders
        </button>
        <div className="order-details-status-update">
          <label htmlFor="status-select" className="order-details-status-label">
            Update Status:
          </label>
          <select
            id="status-select"
            className="order-details-status-select"
            onChange={ (e) => {
              if (e.target.value !== order.status) {
                updateOrderStatus(order.order_id, e.target.value, order.status);
              }
            } }
            disabled={ updatingStatus === order.order_id }
            value={ order.status || '' }
            aria-label="Update order status"
          >
            <option value={ order.status || '' }>✓ { order.status || 'N/A' } (Current)</option>
            { getValidStatusOptions(order.status).map((status) => (
              <option key={ status } value={ status }>
                { status }
              </option>
            )) }
          </select>
        </div>
        { userData?.role !== 'staff' && (
          <button
            onClick={ handleDelete }
            className="order-details-delete-button"
            disabled={ isDeleting }
            aria-label="Delete order"
          >
            Delete Order
          </button>
        ) }
      </div>
    </div>
  );
}

export default OrderDetails;
