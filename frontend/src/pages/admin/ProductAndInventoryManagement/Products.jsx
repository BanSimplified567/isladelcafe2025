import LoadingPage from '@components/LoadingPage';
import '@style/Products.css';
import { Edit, Filter, Plus, Search, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';


const PRODUCT_URL = '/api/core.php';


function Products() {
  const [activeView, setActiveView] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    subtype: '',
    image: '',
    description: '',
    temperature: '',
    rating: 0,
    caffeine_level: '',
    small_price: 0,
    medium_price: 0,
    large_price: 0,
    small_quantity: 10,
    medium_quantity: 10,
    large_quantity: 10,
    reviews: '',
    low_stock_threshold: 5,
    status: 'active',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);


  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('tokenadmin');
      setLoading(true);
      const response = await fetch(`${PRODUCT_URL}?action=product_get_all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();

      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.error('Unexpected API response format:', data);
        setProducts([]);
        setError('Received unexpected data format from server');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file' && name === 'image') {
      const file = files[0];
      setImageFile(file);
      setFormData((prev) => ({ ...prev, image: file ? file.name : '' }));
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          name.includes('price') ||
            name.includes('quantity') ||
            name === 'rating' ||
            name === 'low_stock_threshold'
            ? parseFloat(value) || 0
            : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('tokenadmin');
      const url = editingProduct
        ? `${PRODUCT_URL}?action=product_update&product_id=${editingProduct.product_id}`
        : `${PRODUCT_URL}?action=product_create`;

      const form = new FormData();

      // Handle numeric fields properly
      const numericFields = [
        'rating', 'small_price', 'medium_price', 'large_price',
        'small_quantity', 'medium_quantity', 'large_quantity',
        'low_stock_threshold'
      ];

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'reviews' && (value === '' || value === null || isNaN(value))) {
          form.append(key, '');
        } else if (numericFields.includes(key)) {
          // Ensure numeric fields are sent as numbers
          form.append(key, Number(value) || 0);
        } else {
          form.append(key, value === null ? '' : value);
        }
      });

      // Only append image if there's a new file
      if (imageFile) {
        form.set('image', imageFile);
      } else if (editingProduct && editingProduct.image) {
        // Keep existing image if no new one is uploaded
        form.set('image', editingProduct.image);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save product');
      }
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: editingProduct
          ? 'Product updated successfully'
          : 'Product created successfully',
      });
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
      });
    }
  };

  const handleDelete = async (productId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#A52A2A',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('tokenadmin');
        const response = await fetch(
          `${PRODUCT_URL}?action=product_delete&product_id=${productId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to delete product');
        }
        Swal.fire('Deleted!', 'Product has been deleted.', 'success');
        fetchProducts();
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message,
        });
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      type: product.type || '',
      subtype: product.subtype || '',
      image: product.image || '',
      description: product.description || '',
      temperature: product.temperature || '',
      rating: product.rating || 0,
      caffeine_level: product.caffeine_level || '',
      small_price: product.small_price || 0,
      medium_price: product.medium_price || 0,
      large_price: product.large_price || 0,
      small_quantity: product.small_quantity || 10,
      medium_quantity: product.medium_quantity || 10,
      large_quantity: product.large_quantity || 10,
      reviews: product.reviews || '',
      low_stock_threshold: product.low_stock_threshold || 5,
      status: product.status || 'active',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      type: '',
      subtype: '',
      image: '',
      description: '',
      temperature: '',
      rating: 0,
      caffeine_level: '',
      small_price: 0,
      medium_price: 0,
      large_price: 0,
      small_quantity: 10,
      medium_quantity: 10,
      large_quantity: 10,
      reviews: '',
      low_stock_threshold: 5,
      status: 'active',
    });
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) => {
      const matchesSearch =
        product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const matchesCategory = categoryFilter === 'all' || product?.type === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    : [];

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return <div className="text-center p-4 fs-4 text-danger">Error: { error }</div>;
  }

  return (
    <div className="product-container">
      <h1 className="product-title">Products Management</h1>

      <div className="product-filter-container">
        <div className="product-search-bar">
          <Search className="product-icon" size={ 20 } />
          <input
            type="text"
            placeholder="Search products..."
            value={ searchQuery }
            onChange={ (e) => setSearchQuery(e.target.value) }
          />
        </div>
        <div className="product-category-filter">
          <Filter className="product-icon" size={ 20 } />
          <select
            value={ categoryFilter }
            onChange={ (e) => setCategoryFilter(e.target.value) }
          >
            <option value="all">All Categories</option>
            <option value="coffee">Coffee</option>
            <option value="matcha">Matcha</option>
            <option value="milk">Milk</option>
            <option value="juice">Juice</option>
            <option value="hot">Hot</option>
          </select>
        </div>
      </div>

      <div className="product-actions-container">
        <div className="product-view-button product-view-toggle">
          <button
            className={ activeView === 'grid' ? 'product-active' : '' }
            onClick={ () => setActiveView('grid') }
          >
            Grid View
          </button>
          <button
            className={ activeView === 'list' ? 'product-active' : '' }
            onClick={ () => setActiveView('list') }
          >
            List View
          </button>
        </div>
        <div className="product-add-new">
          <button onClick={ handleAddNew }>
            <Plus size={ 16 } /> Add Product
          </button>
        </div>
      </div>


      <div>
        { activeView === 'grid' ? (
          <div className="product-grid">
            { filteredProducts.map((product) => (
              <div key={ product.product_id } className={ `product-card ${product.status === 'inactive' ? 'product-inactive' : ''}` }>
                <div className="product-card-image-wrapper">
                  <img
                    src={ `/api/serve_image.php?image=${encodeURIComponent(product.image || 'Isladelcafe.jpg')}&type=product` }
                    alt={ product.name }
                    className={ `product-card-image ${product.status === 'inactive' ? 'product-image-inactive' : ''}` }
                    onError={ (e) => {
                      e.target.onerror = null;
                      e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                    } }
                  />
                  <span className={ `product-status-badge ${product.status}` }>
                    { product.status.charAt(0).toUpperCase() + product.status.slice(1) }
                  </span>
                </div>
                <div className="product-card-body">
                  <h3 className="product-card-title">{ product.name }</h3>
                  <p className="product-card-subtitle">{ product.type } - { product.subtype }</p>
                  <p className="product-card-pricing">
                    <strong>Prices: </strong>
                    Small ₱{ parseFloat(product.small_price).toFixed(2) }, Medium ₱{ parseFloat(product.medium_price).toFixed(2) }, Large ₱{ parseFloat(product.large_price).toFixed(2) }
                  </p>
                  <p className="product-card-stock">
                    <strong>Stock: </strong>
                    Small { product.small_quantity }, Medium { product.medium_quantity }, Large { product.large_quantity }
                  </p>
                </div>
                <div className="product-card-footer">
                  <button className="product-action-btn edit" onClick={ () => handleEdit(product) }>
                    <Edit size={ 18 } />
                  </button>
                  <button
                    className="product-action-btn delete"
                    onClick={ () => handleDelete(product.product_id) }
                  >
                    <Trash size={ 18 } />
                  </button>
                </div>
              </div>
            )) }
          </div>
        ) : (
          <div className="product-table-responsive">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Prices</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                { filteredProducts.map((product) => (
                  <tr key={ product.product_id } className={ product.status === 'inactive' ? 'product-inactive-row' : '' }>
                    <td>
                      <img
                        src={ `/api/serve_image.php?image=${encodeURIComponent(product.image || 'Isladelcafe.jpg')}&type=product` }
                        alt={ product.name }
                        className={ `product-table-image ${product.status === 'inactive' ? 'product-image-inactive' : ''}` }
                        onError={ (e) => {
                          e.target.onerror = null;
                          e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                        } }
                      />
                    </td>
                    <td>{ product.name }</td>
                    <td>{ product.type } - { product.subtype }</td>
                    <td>S: ₱{ parseFloat(product.small_price).toFixed(2) }, M: ₱{ parseFloat(product.medium_price).toFixed(2) }, L: ₱{ parseFloat(product.large_price).toFixed(2) }</td>
                    <td>S: { product.small_quantity }, M: { product.medium_quantity }, L: { product.large_quantity }</td>
                    <td>
                      <span className={ `product-status-indicator ${product.status}` }>
                        { product.status.charAt(0).toUpperCase() + product.status.slice(1) }
                      </span>
                    </td>
                    <td>
                      <div className="product-flex product-gap-2">
                        <button className="product-action-btn edit" onClick={ () => handleEdit(product) }>
                          <Edit size={ 18 } />
                        </button>
                        <button
                          className="product-action-btn delete"
                          onClick={ () => handleDelete(product.product_id) }
                        >
                          <Trash size={ 18 } />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) }
              </tbody>
            </table>
          </div>
        ) }
      </div>

      { showModal && (
        <div className="product-modal-overlay">
          <div className="product-modal-dialog">
            <div className="product-modal-header">
              <h2 className="product-modal-title">
                { editingProduct ? 'Edit Product' : 'Add New Product' }
              </h2>
              <button
                type="button"
                className="product-btn-close"
                onClick={ () => setShowModal(false) }
                aria-label="Close"
              >×</button>
            </div>
            <form onSubmit={ handleSubmit } className="product-modal-form">
              <div className="product-modal-body">
                <div className="product-modal-section">
                  <h3 className="product-modal-section-title">Basic Information</h3>
                  <div className="product-modal-grid">
                    <div className="product-form-group">
                      <label htmlFor="name" className="product-form-label">Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={ formData.name }
                        onChange={ handleInputChange }
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="type" className="product-form-label">Type</label>
                      <select
                        name="type"
                        id="type"
                        value={ formData.type }
                        onChange={ handleInputChange }
                        className="product-form-select"
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="coffee">Coffee</option>
                        <option value="matcha">Matcha</option>
                        <option value="milk">Milk</option>
                        <option value="juice">Juice</option>
                        <option value="hot">Hot</option>
                      </select>
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="subtype" className="product-form-label">Subtype</label>
                      <select
                        name="subtype"
                        id="subtype"
                        value={ formData.subtype }
                        onChange={ handleInputChange }
                        className="product-form-select"
                        required
                      >
                        <option value="">Select Subtype</option>
                        <option value="premium">Premium</option>
                        <option value="premium blend">Premium Blend</option>
                        <option value="signature">Signature</option>
                        <option value="ceremonial grade">Ceremonial Grade</option>
                        <option value="classic">Classic</option>
                      </select>
                    </div>
                    <div className="product-form-group" style={ { gridColumn: 'span 2' } }>
                      <label htmlFor="description" className="product-form-label">Description</label>
                      <textarea
                        name="description"
                        id="description"
                        value={ formData.description }
                        onChange={ handleInputChange }
                        className="product-form-textarea"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="temperature" className="product-form-label">Temperature</label>
                      <select
                        name="temperature"
                        id="temperature"
                        value={ formData.temperature }
                        onChange={ handleInputChange }
                        className="product-form-select"
                        required
                      >
                        <option value="">Select Temperature</option>
                        <option value="iced">Iced</option>
                        <option value="hot">Hot</option>
                      </select>
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="rating" className="product-form-label">Rating</label>
                      <input
                        type="number"
                        name="rating"
                        id="rating"
                        value={ formData.rating }
                        onChange={ handleInputChange }
                        className="product-form-input"
                        min="1"
                        max="5"
                        step="0.1"
                        required
                      />
                    </div>



                    <div className="product-form-group">
                      <label htmlFor="caffeine_level" className="product-form-label">Caffeine Level</label>
                      <select
                        name="caffeine_level"
                        id="caffeine_level"
                        value={ formData.caffeine_level }
                        onChange={ handleInputChange }
                        className="product-form-select"
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="none">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="medium-high">Medium-High</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="product-form-group" style={ { gridColumn: 'span 2' } }>
                      <label htmlFor="image" className="product-form-label">Image</label>
                      <input
                        type="file"
                        name="image"
                        id="image"
                        accept="image/*"
                        onChange={ handleInputChange }
                        className="product-form-input"
                      />
                      { imagePreview ? (
                        <img src={ imagePreview } alt="Preview" className="product-image-preview" />
                      ) : formData.image && !imageFile ? (
                        <img
                          src={ `/api/serve_image.php?image=${encodeURIComponent(formData.image)}&type=product` }
                          alt="Current"
                          className="product-image-preview"
                          onError={ (e) => {
                            e.target.onerror = null;
                            e.target.src = `/api/serve_image.php?image=Isladelcafe.jpg&type=product`;
                          } }
                        />
                      ) : null }
                    </div>
                  </div>
                </div>

                <div className="product-modal-section">
                  <h3 className="product-modal-section-title">Pricing</h3>
                  <div className="product-modal-grid">
                    <div className="product-form-group">
                      <label htmlFor="small_price" className="product-form-label">Small Price</label>
                      <input
                        type="number"
                        name="small_price"
                        id="small_price"
                        value={ formData.small_price }
                        onChange={ handleInputChange }
                        min="0"
                        step="0.01"
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="medium_price" className="product-form-label">Medium Price</label>
                      <input
                        type="number"
                        name="medium_price"
                        id="medium_price"
                        value={ formData.medium_price }
                        onChange={ handleInputChange }
                        min="0"
                        step="0.01"
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="large_price" className="product-form-label">Large Price</label>
                      <input
                        type="number"
                        name="large_price"
                        id="large_price"
                        value={ formData.large_price }
                        onChange={ handleInputChange }
                        min="0"
                        step="0.01"
                        className="product-form-input"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="product-modal-section">
                  <h3 className="product-modal-section-title">Stock</h3>
                  <div className="product-modal-grid">
                    <div className="product-form-group">
                      <label htmlFor="small_quantity" className="product-form-label">Small Quantity</label>
                      <input
                        type="number"
                        name="small_quantity"
                        id="small_quantity"
                        value={ formData.small_quantity }
                        onChange={ handleInputChange }
                        min="0"
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="medium_quantity" className="product-form-label">Medium Quantity</label>
                      <input
                        type="number"
                        name="medium_quantity"
                        id="medium_quantity"
                        value={ formData.medium_quantity }
                        onChange={ handleInputChange }
                        min="0"
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="large_quantity" className="product-form-label">Large Quantity</label>
                      <input
                        type="number"
                        name="large_quantity"
                        id="large_quantity"
                        value={ formData.large_quantity }
                        onChange={ handleInputChange }
                        min="0"
                        className="product-form-input"
                        required
                      />
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="low_stock_threshold" className="product-form-label">Low Stock Threshold</label>
                      <input
                        type="number"
                        name="low_stock_threshold"
                        id="low_stock_threshold"
                        value={ formData.low_stock_threshold }
                        onChange={ handleInputChange }
                        min="0"
                        className="product-form-input"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="product-modal-section">
                  <h3 className="product-modal-section-title">Status & Reviews</h3>
                  <div className="product-modal-grid">
                    <div className="product-form-group">
                      <label htmlFor="status" className="product-form-label">Status</label>
                      <select
                        name="status"
                        id="status"
                        value={ formData.status }
                        onChange={ handleInputChange }
                        className="product-form-select"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="product-form-group">
                      <label htmlFor="reviews" className="product-form-label">Reviews</label>
                      <input
                        type="number"
                        name="reviews"
                        id="reviews"
                        value={ formData.reviews }
                        onChange={ handleInputChange }
                        className="product-form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="product-modal-footer">
                <button
                  type="button"
                  className="product-view-toggle button product-btn-cancel"
                  onClick={ () => setShowModal(false) }
                >
                  Cancel
                </button>
                <button type="submit" className="product-view-toggle button product-btn-submit">
                  { editingProduct ? 'Update Product' : 'Create Product' }
                </button>
              </div>
            </form>
          </div>
        </div>
      ) }
    </div>
  );
}

export default Products;
