import LoadingPage from '@components/LoadingPage';
import {
  ErrorOutline as ErrorIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  SwapVert as SwapVertIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import useAuthStore from '@store/authStore';
import '@style/Inventory.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const API_URL = '/api/core.php';

function UpdateStockContainer() {
  const { isAuthenticated, userData, loading: authLoading, checkAuthStatus } = useAuthStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || (userData?.role !== 'admin' && userData?.role !== 'manager')) {
      navigate('/loginadmin', { replace: true });
      return;
    }

    fetchProducts();
  }, [page, authLoading, isAuthenticated, userData, navigate]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('tokenadmin');
      const response = await fetch(
        `${API_URL}?action=product_get_all&page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().clearAuth();
          navigate('/loginadmin', { replace: true });
          return;
        }
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Unexpected API response format:', data);
        setProducts([]);
        setError('Received unexpected data format from server');
      }
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (productId, quantities) => {
    try {
      const payload = {};
      const originalProduct = products.find(p => p.product_id === productId);

      if (!originalProduct) {
        throw new Error('Product not found');
      }

      if (quantities.Small !== undefined && quantities.Small !== originalProduct.small_quantity) {
        payload.small_quantity = quantities.Small;
      }
      if (quantities.Medium !== undefined && quantities.Medium !== originalProduct.medium_quantity) {
        payload.medium_quantity = quantities.Medium;
      }
      if (quantities.Large !== undefined && quantities.Large !== originalProduct.large_quantity) {
        payload.large_quantity = quantities.Large;
      }

      if (Object.keys(payload).length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'No stock quantities were changed',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
        return;
      }

      const token = localStorage.getItem('tokenadmin');
      // Include action in the payload instead of query string
      const payloadWithAction = {
        ...payload,
        action: 'product_update'
      };

      const response = await fetch(`${API_URL}?product_id=${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadWithAction),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          useAuthStore.getState().clearAuth();
          navigate('/loginadmin', { replace: true });
          return;
        }
        throw new Error(errorData.message
          || 'Failed to update stock');
      }

      const updatedData = await response.json();

      if (updatedData.success) {
        setProducts(
          products.map((product) =>
            product.product_id === productId
              ? {
                ...product,
                small_quantity: payload.small_quantity ?? product.small_quantity,
                medium_quantity: payload.medium_quantity ?? product.medium_quantity,
                large_quantity: payload.large_quantity ?? product.large_quantity,
                total_stock:
                  (payload.small_quantity ?? product.small_quantity) +
                  (payload.medium_quantity ?? product.medium_quantity) +
                  (payload.large_quantity ?? product.large_quantity),
              }
              : product
          )
        );

        Swal.fire({
          icon: 'success',
          title: 'Stock Updated',
          text: 'Product stock has been updated successfully',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message,
      });
      fetchProducts();
    }
  };

  const getStockStatus = (totalStock, lowStockThreshold) => {
    if (totalStock === 0) return 'out-of-stock';
    if (totalStock <= lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const filteredProducts = Array.isArray(products)
    ? products
      .filter(
        (product) =>
          product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product?.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const order = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'name') return order * (a?.name?.localeCompare(b?.name || '') || 0);
        if (sortBy === 'stock') return order * ((a?.total_stock || 0) - (b?.total_stock || 0));
        return 0;
      })
    : [];

  if (authLoading || loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="stock-container">
        <div className="error-state">
          <ErrorIcon fontSize="medium" />
          <span>Error: { error }</span>
          <button className="btn btn-coffee retry-btn" onClick={ fetchProducts }>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-container">
      <div className="stock-header">
        <h1 className="stock-title">
          <InventoryIcon fontSize="large" /> Update Stock Quantity
        </h1>
        <div className="stock-controls">
          <div className="stock-search-bar">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search products..."
              value={ searchQuery }
              onChange={ (e) => setSearchQuery(e.target.value) }
            />
          </div>
          <div className="stock-sort-controls">
            <select
              className="stock-form-select"
              value={ sortBy }
              onChange={ (e) => setSortBy(e.target.value) }
            >
              <option value="name">Sort by Name</option>
              <option value="stock">Sort by Stock</option>
            </select>
            <button
              className="stock-btn"
              onClick={ () => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }
            >
              <SwapVertIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="stock-stats-grid">
        { [
          { icon: <InventoryIcon fontSize="large" />, title: 'Total Products', value: products.length, className: 'stock-total' },
          {
            icon: <ErrorIcon fontSize="large" />,
            title: 'Low Stock',
            value: products.filter((p) => p?.total_stock <= p?.low_stock_threshold && p?.total_stock > 0).length,
            className: 'stock-low',
          },
          {
            icon: <ErrorIcon fontSize="large" />,
            title: 'Out of Stock',
            value: products.filter((p) => p?.total_stock === 0).length,
            className: 'stock-out',
          },
          {
            icon: <TrendingUpIcon fontSize="large" />,
            title: 'Avg. Stock',
            value: products.length > 0
              ? Math.round(products.reduce((acc, p) => acc + (p?.total_stock || 0), 0) / products.length)
              : 0,
            className: 'stock-avg',
          },
        ].map((stat, index) => (
          <div key={ index } className={ `stock-stat-card ${stat.className}` }>
            <div className="stock-card-body">
              <div className="stock-icon">{ stat.icon }</div>
              <div>
                <p className="stock-card-title">{ stat.title }</p>
                <p className="stock-card-text">{ stat.value }</p>
              </div>
            </div>
          </div>
        )) }
      </div>

      <div className="stock-card-grid">
        { filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div key={ product.product_id } className="stock-product-card">
              <div className="stock-product-card-header">
                <img
                  src={ `/api/serve_image.php?image=${encodeURIComponent(product.image || 'Isladelcafe.jpg')}&type=product` }
                  alt={ product.name }
                  className="stock-product-image"
                  onError={ (e) => {
                    e.target.onerror = null;
                    e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                  } }
                />
              </div>
              <div className="stock-product-card-body">
                <h3 className="stock-product-title">{ product.name }</h3>
                <p className="stock-product-description">
                  { product.description?.split(' ').slice(0, 10).join(' ') }
                  { product.description?.split(' ').length > 10 ? '...' : '' }
                </p>
                <p className="stock-product-category"><strong>Category:</strong> { product.type }</p>
                <p className="stock-product-stock">
                  <strong>Stock (S/M/L):</strong> { product.small_quantity }/{ product.medium_quantity }/{ product.large_quantity }
                </p>
                <span className={ `stock-status-badge ${getStockStatus(product.total_stock, product.low_stock_threshold)}` }>
                  { getStockStatus(product.total_stock, product.low_stock_threshold).replace('-', ' ') }
                </span>
              </div>
              <div className="stock-product-card-footer">
                <button
                  className="stock-btn-update"
                  onClick={ () => {
                    Swal.fire({
                      title: `Update Stock for ${product.name}`,
                      html: `
                        <div class="stock-swal-input-group">
                          <label class="stock-swal-label">Small Quantity:</label>
                          <input type="number" id="small_quantity" value="${product.small_quantity}" min="0" step="1" class="stock-swal-input">
                        </div>
                        <div class="stock-swal-input-group">
                          <label class="stock-swal-label">Medium Quantity:</label>
                          <input type="number" id="medium_quantity" value="${product.medium_quantity}" min="0" step="1" class="stock-swal-input">
                        </div>
                        <div class="stock-swal-input-group">
                          <label class="stock-swal-label">Large Quantity:</label>
                          <input type="number" id="large_quantity" value="${product.large_quantity}" min="0" step="1" class="stock-swal-input">
                        </div>
                      `,
                      showCancelButton: true,
                      confirmButtonText: 'Update Stock',
                      cancelButtonText: 'Cancel',
                      preConfirm: () => {
                        const small = parseInt(document.getElementById('small_quantity').value);
                        const medium = parseInt(document.getElementById('medium_quantity').value);
                        const large = parseInt(document.getElementById('large_quantity').value);
                        if (isNaN(small) || isNaN(medium) || isNaN(large) || small < 0 || medium < 0 || large < 0) {
                          Swal.showValidationMessage('Please enter valid, non-negative numbers');
                          return false;
                        }
                        return { Small: small, Medium: medium, Large: large };
                      },
                    }).then((result) => {
                      if (result.isConfirmed) {
                        handleUpdateStock(product.product_id, result.value);
                      }
                    });
                  } }
                >
                  Update Stock
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="stock-no-results">
            <p>No products found matching your search.</p>
          </div>
        ) }
      </div>

      { totalPages > 1 && (
        <div className="stock-pagination">
          <button
            className="stock-btn-pagination"
            disabled={ page === 1 }
            onClick={ () => setPage((prev) => Math.max(prev - 1, 1)) }
          >
            Previous
          </button>
          <span>
            Page { page } of { totalPages }
          </span>
          <button
            className="stock-btn-pagination"
            disabled={ page === totalPages }
            onClick={ () => setPage((prev) => Math.min(prev + 1, totalPages)) }
          >
            Next
          </button>
        </div>
      ) }
    </div>
  );
}

export default UpdateStockContainer;
