import { Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import useAuthStore from '@store/authStore';
import '@style/OrderHistory.css';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = '/api/core.php';

function OrderHistory() {
  const navigate = useNavigate();
  const { isAuthenticated, userData, loading: authLoading, checkAuthStatus } = useAuthStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const statuses = [
    'All',
    'Pending',
    'Confirmed',
    'Processing',
    'Ready for Pickup',
    'Out for Delivery',
    'Delivered',
    'Completed',
    'Cancelled',
    'Failed Delivery',
    'Returned',
    'Refund'
  ];

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const fetchOrderHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('tokenadmin');
      if (!token) {
        throw new Error('Authentication token is missing');
      }

      const response = await axios.get(API_URL, {
        params: {
          action: 'order_history',
          status: statusFilter,
          page: page + 1,
          limit: rowsPerPage,
          search: searchQuery,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        setHistory(response.data.data.history);
        setTotalRecords(response.data.data.total_records);
      } else {
        throw new Error(response.data.message || 'Failed to fetch order history');
      }
    } catch (error) {
      console.error('Error fetching order history:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load order history';
      setError(errorMessage);

      if (error.response?.status === 401) {
        useAuthStore.getState().clearAuth();
        navigate('/loginadmin', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, searchQuery, navigate]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !['admin', 'staff', 'manager'].includes(userData?.role)) {
      navigate('/loginadmin', { replace: true });
      return;
    }

    fetchOrderHistory();
  }, [authLoading, isAuthenticated, userData?.role, fetchOrderHistory]);

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchOrderHistory();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, page, rowsPerPage, statusFilter]);

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Invalid Date'
      : date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
    });
  };

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase?.() || '';
    switch (statusLower) {
      case 'completed':
      case 'delivered':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'refund':
        return 'status-refund';
      case 'cancelled':
        return 'status-cancelled';
      case 'ready for pickup':
        return 'status-ready';
      case 'for delivery':
        return 'status-delivery';
      default:
        return 'status-pending';
    }
  };

  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startRecord = page * rowsPerPage + 1;
  const endRecord = Math.min((page + 1) * rowsPerPage, totalRecords);

  return (
    <div className="orderhistory-theme">
      <div className="orderhistory-main">
        <div className="orderhistory-header">
          <div className="orderhistory-header-content">
            <div className="orderhistory-header-title">
              <h1>☕ Coffee Order History</h1>
            </div>
            <div className="orderhistory-header-actions">
              <button
                className="orderhistory-btn-outline"
                onClick={ () => navigate('/orders') }
              >
                ← Back to Orders
              </button>
            </div>
          </div>
        </div>

        <div className="orderhistory-content">
          <div className="orderhistory-card">
            <div className="orderhistory-controls">
              <div className="orderhistory-controls-row">
                <div className="orderhistory-controls-status">
                  <select
                    className="orderhistory-form-control"
                    value={ statusFilter }
                    onChange={ handleStatusChange }
                  >
                    { statuses.map((status) => (
                      <option key={ status } value={ status }>
                        { status }
                      </option>
                    )) }
                  </select>
                </div>

                <div className="orderhistory-controls-search">
                  <div className="orderhistory-input-group">
                    <span className="orderhistory-input-group-text">
                      <SearchIcon className="orderhistory-search-icon" />
                    </span>
                    <input
                      type="text"
                      className="orderhistory-form-control"
                      placeholder="Search by order number, name, email, or username..."
                      value={ searchQuery }
                      onChange={ handleSearch }
                    />
                  </div>
                </div>

                <div className="orderhistory-controls-refresh">
                  <button
                    className="orderhistory-btn orderhistory-btn-refresh"
                    onClick={ fetchOrderHistory }
                    title="Refresh Orders"
                  >
                    <RefreshIcon /> Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="orderhistory-card-body">
              { loading ? (
                <div className="orderhistory-loading-container">
                  <div className="orderhistory-loading-spinner"></div>
                  <p>Brewing order history...</p>
                </div>
              ) : error ? (
                <div className="orderhistory-alert orderhistory-alert-danger">
                  { error }
                  <div className="orderhistory-alert-actions">
                    <button
                      className="orderhistory-btn-outline orderhistory-btn-retry"
                      onClick={ fetchOrderHistory }
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="orderhistory-table-responsive">
                    <table className="orderhistory-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Updated By</th>
                        </tr>
                      </thead>
                      <tbody>
                        { history
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((item) => (
                            <tr key={ item.history_id }>
                              <td>
                                <strong>{ item.order_number || 'N/A' }</strong>
                              </td>
                              <td>
                                <div className="orderhistory-customer-info">
                                  <div className="orderhistory-customer-name">{ item.fullname || 'N/A' }</div>
                                  <div className="orderhistory-customer-email">{ item.email || 'N/A' }</div>
                                </div>
                              </td>
                              <td>
                                <strong>{ formatCurrency(item.total_amount) }</strong>
                              </td>
                              <td>
                                <span
                                  className={ `orderhistory-payment-badge ${item.payment_method === 'COD' ? 'orderhistory-payment-cod' : 'orderhistory-payment-online'
                                    }` }
                                >
                                  { item.payment_method || 'N/A' }
                                </span>
                              </td>
                              <td>
                                <span className={ `orderhistory-status-badge ${getStatusClass(item.status)}` }>
                                  { item.status || 'Unknown' }
                                </span>
                              </td>
                              <td>{ formatDate(item.created_at) }</td>
                              <td>{ item.username || 'N/A' }</td>
                            </tr>
                          )) }
                      </tbody>
                    </table>
                  </div>

                  <div className="orderhistory-pagination">
                    <div className="orderhistory-pagination-row">
                      <div className="orderhistory-pagination-info">
                        <span>Rows per page:</span>
                        <select
                          className="orderhistory-form-control orderhistory-pagination-select"
                          value={ rowsPerPage }
                          onChange={ handleChangeRowsPerPage }
                        >
                          <option value={ 5 }>5</option>
                          <option value={ 10 }>10</option>
                          <option value={ 25 }>25</option>
                          <option value={ 50 }>50</option>
                        </select>
                        <span>
                          { startRecord }-{ endRecord } of { totalRecords }
                        </span>
                      </div>
                      <div className="orderhistory-pagination-controls">
                        <button
                          className="orderhistory-btn orderhistory-btn-pagination"
                          onClick={ () => handleChangePage(page - 1) }
                          disabled={ page === 0 }
                        >
                          Previous
                        </button>
                        { [...Array(Math.min(5, totalPages))].map((_, index) => {
                          const pageNumber = Math.max(0, Math.min(totalPages - 5, page - 2)) + index;
                          return (
                            <button
                              key={ pageNumber }
                              className={ `orderhistory-btn orderhistory-btn-pagination${page === pageNumber ? ' orderhistory-btn-active' : ''}` }
                              onClick={ () => handleChangePage(pageNumber) }
                              disabled={ page === pageNumber }
                            >
                              { pageNumber + 1 }
                            </button>
                          );
                        }) }
                        <button
                          className="orderhistory-btn orderhistory-btn-pagination"
                          onClick={ () => handleChangePage(page + 1) }
                          disabled={ page >= totalPages - 1 }
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;
