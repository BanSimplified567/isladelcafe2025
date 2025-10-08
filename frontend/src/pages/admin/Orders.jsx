import LoadingPage from '@components/LoadingPage';
import { OrderTimer } from '@components/OrderTimer';
import useAuthStore from '@store/authStore';
import useOrderStore from '@store/useOrderStore';
import '@style/Orders.css';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Orders() {
  const navigate = useNavigate();
  const { userData } = useAuthStore();
  const userRole = userData?.role || 'staff';

  const {
    orders,
    loading,
    pagination,
    searchQuery,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
    setSearchQuery,
    setPagination,
  } = useOrderStore();

  // Debounce search effect - handles both search and pagination
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery !== '') {
        setPagination(1); // reset to page 1 when searching
      }
      fetchOrders(pagination.currentPage, pagination.ordersPerPage, searchQuery);
    }, searchQuery !== '' ? 500 : 0); // No debounce for empty search

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, pagination.currentPage, pagination.ordersPerPage, fetchOrders, setPagination]);

  const getValidStatusOptions = (currentStatus) => {
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

  const getStatusColor = (status) => {
    const statusColors = {
      Pending: 'pending',
      Confirmed: 'confirmed',
      Processing: 'processing',
      'Ready for Pickup': 'ready-for-pickup',
      'Ready for Delivery': 'ready-for-delivery',
      'Out for Delivery': 'out-for-delivery',
      Delivered: 'delivered',
      Completed: 'completed',
      Refund: 'refund',
      Cancelled: 'cancelled',
      'Failed Delivery': 'failed-delivery',
      Returned: 'returned',
      default: 'default',
    };
    return `orders-badge-${statusColors[status] || 'default'}`;
  };

  if (loading && !orders.length) {
    return <LoadingPage />;
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div className="orders-header-left">
          <h2 className="orders-title">Order Management</h2>
          <span className={ `orders-role-badge ${userRole}` }>
            { userRole.charAt(0).toUpperCase() + userRole.slice(1) }
          </span>
          <span className="orders-status-badge">Full Status Control</span>
        </div>
        <div className="orders-header-right">
          <input
            type="text"
            className="orders-search-input"
            placeholder="Search by order number, user ID, name, email, phone, address, status..."
            value={ searchQuery }
            onChange={ (e) => setSearchQuery(e.target.value) }
          />
          <button
            onClick={ () => fetchOrders(pagination.currentPage, pagination.ordersPerPage, searchQuery) }
            className="orders-btn orders-btn-refresh"
            aria-label="Refresh orders"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="orders-card">
        <div className="orders-card-body">
          <div className="orders-table-responsive">
            <table className="orders-table">
              <thead className="orders-table-head">
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th className="orders-table-center">Items</th>
                  <th className="orders-table-end">Total</th>
                  <th className="orders-table-center">Status</th>
                  <th className="orders-table-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                { orders.map((order) => (
                  <tr key={ order.order_id }>
                    <td>{ order.order_number }</td>
                    <td>
                      <div className="orders-customer-info">
                        <div className="orders-customer-name">
                          <strong>Name:</strong> { order.first_name } { order.last_name }
                        </div>
                        <div className="orders-customer-email">
                          <strong>Email:</strong> { order.email }
                        </div>
                        <div className="orders-customer-phone">
                          <strong>Phone:</strong> { order.phone }
                        </div>
                        <div className="orders-customer-address">
                          <strong>Address:</strong> { order.address }, { order.city }, { order.zipcode }
                        </div>
                        <div className="orders-customer-payment">
                          <strong>Payment Method:</strong> { order.payment_method }
                        </div>
                        { order.payment_method === "GCash" && (
                          <div className="orders-customer-payment">
                            <strong>Payment Reference:</strong> { order.payment_reference }
                          </div>
                        ) }
                        <div className="orders-customer-payment">
                          <strong>Order Date:</strong> { order.created_at }
                        </div>
                      </div>
                    </td>
                    <td className="orders-table-center">{ order.items_count || 0 } items</td>
                    <td className="orders-table-end">
                      ₱{ Number.parseFloat(order.total_amount).toFixed(2) }
                    </td>
                    <td className="orders-table-center">
                      { order.items_count === 0 ? (
                        <span className={ `orders-badge ${getStatusColor(order.status)}` }>
                          { order.status }
                        </span>
                      ) : userRole !== 'staff' || order.status !== 'Pending' ? (
                        <div className="orders-status-wrapper">
                          <span
                            className={ `orders-badge ${getStatusColor(order.status)} orders-badge-with-icon` }
                          >
                            { order.status }
                          </span>
                          <OrderTimer createdAt={ order.created_at } orderStatus={ order.status } />
                          <select
                            value={ order.status }
                            onChange={ (e) =>
                              updateOrderStatus(order.order_id, e.target.value, order.status)
                            }
                            disabled={ useOrderStore.getState().updatingStatus === order.order_id }
                            className="orders-status-select"
                            aria-label={ `Update status for order ${order.order_number}` }
                          >
                            <option value={ order.status }>✓ { order.status } (Current)</option>
                            { getValidStatusOptions(order.status).map((status) => (
                              <option key={ status } value={ status }>
                                { status }
                              </option>
                            )) }
                          </select>
                        </div>
                      ) : (
                        <span className={ `orders-badge ${getStatusColor(order.status)}` }>
                          { order.status }
                        </span>
                      ) }
                    </td>
                    <td className="orders-table-center">
                      <div className="orders-actions">
                        <button
                          onClick={ () => navigate(`/orders/${order.order_id}`) }
                          className="orders-btn orders-btn-view"
                          aria-label={ `View details for order ${order.order_number}` }
                        >
                          View
                        </button>
                        { userRole !== 'staff' && (
                          <button
                            onClick={ () => deleteOrder(order.order_id, order.items_count) }
                            className="orders-btn orders-btn-delete"
                            aria-label={ `Delete order ${order.order_number}` }
                          >
                            Delete
                          </button>
                        ) }
                      </div>
                    </td>
                  </tr>
                )) }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="orders-pagination-info">
        <div>
          Showing { (pagination.currentPage - 1) * pagination.ordersPerPage + 1 }–
          { Math.min(pagination.currentPage * pagination.ordersPerPage, pagination.totalOrders) } of{ ' ' }
          { pagination.totalOrders } orders
        </div>
        <div className="orders-pagination-controls">
          <button
            onClick={ () => setPagination(pagination.currentPage - 1) }
            disabled={ pagination.currentPage === 1 }
            className="orders-btn orders-btn-pagination"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span>
            Page { pagination.currentPage } of { pagination.totalPages }
          </span>
          <button
            onClick={ () => setPagination(pagination.currentPage + 1) }
            disabled={ pagination.currentPage >= pagination.totalPages }
            className="orders-btn orders-btn-pagination"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default Orders;
