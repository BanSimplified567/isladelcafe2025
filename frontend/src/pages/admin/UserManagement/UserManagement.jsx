import LoadingPage from '@components/LoadingPage';
import '@style/Users.css';
import axios from 'axios';
import { Edit, History, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

const API_URL = '/api/core.php';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;
  const [expandedRows, setExpandedRows] = useState({});
  const [formData, setFormData] = useState({
    firstname: '',
    middlename: '',
    lastname: '',
    username: '',
    email: '',
    status: 'active',
    phone: '',
    address: '',
    city: '',
    zipcode: '',
    loyalty_points: 0,
    loyalty_points_used: 0,
  });
  const [originalFormData, setOriginalFormData] = useState({});
  const [showFormModal, setShowFormModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const token = localStorage.getItem('tokenadmin');
  const currentUserRole = localStorage.getItem('adminRole') || 'staff';

  const getFullName = (user) => `${user.firstname || ''} ${user.middlename || ''} ${user.lastname || ''}`.trim();

  const filteredUsers = users
    .filter((user) => {
      if (!user || !user.role) return false;
      if (currentUserRole === 'admin') {
        return user.role !== 'admin';
      } else if (currentUserRole === 'manager') {
        return ['staff', 'customer'].includes(user.role);
      } else {
        return user.role === 'customer';
      }
    })
    .filter((user) => {
      const term = searchTerm.toLowerCase();
      return (
        getFullName(user).toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return getFullName(a).localeCompare(getFullName(b));
      } else if (sortBy === 'role') {
        return (a.role || '').localeCompare(b.role || '');
      } else if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'loyalty_points') {
        return (Number(b.loyalty_points) || 0) - (Number(a.loyalty_points) || 0);
      }
      return 0;
    });

  useEffect(() => {
    if (!token) {
      Swal.fire({
        icon: 'error',
        title: 'Unauthorized',
        text: 'Please log in to access this page',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      }).then(() => {
        window.location.href = '/loginadmin';
      });
    } else {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}?action=fetch_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        const validUsers = response.data.data.filter(
          (user) => user && typeof user === 'object' && user.user_id && user.role
        );
        setUsers(validUsers);
      } else {
        throw new Error(response.data.message || 'Unexpected response format');
      }
    } catch (error) {
      setError(error.message || 'Failed to load users');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load users',
        background: '#f5f0eb',
        color: '#5e503f',
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        window.location.href = '/loginadmin';
      }
    } finally {
      setIsLoading(false);
    }
  };

  const viewUserHistory = async (userId) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}?action=fetch_user_history&user_id=${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.success) {
        setSelectedUser({
          user_id: userId,
          history: response.data.data?.history || [],
        });
        setShowHistoryModal(true);
      } else {
        throw new Error(response.data.message || 'Failed to fetch user history');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load user history',
        background: '#f5f0eb',
        color: '#5e503f',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleText = (id, field) => {
    setExpandedRows((prev) => ({
      ...prev,
      [`${id}-${field}`]: !prev[`${id}-${field}`],
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'loyalty_points' || name === 'loyalty_points_used' ? Number(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (JSON.stringify(formData) === JSON.stringify(originalFormData)) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made.',
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    setIsLoading(true);
    try {
      if (!selectedUser?.user_id) {
        throw new Error('User ID is required');
      }
      const response = await axios.post(
        API_URL,
        {
          action: 'updated_users',
          user_id: selectedUser.user_id,
          ...formData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: response.data.message || 'User updated successfully',
          timer: 1500,
          showConfirmButton: false,
          background: '#f5f0eb',
          color: '#5e503f',
        });
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.user_id === selectedUser.user_id
              ? { ...user, ...response.data.data }
              : user
          )
        );
        closeFormModal();
      } else {
        throw new Error(response.data.message || 'Failed to update user');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Failed to process request',
        background: '#f5f0eb',
        color: '#5e503f',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Invalid user data.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'staff') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Staff users cannot edit other users.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'manager' && user.role === 'manager') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Managers cannot edit other managers.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'admin' && user.role === 'admin') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Admin users cannot be edited.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    const initialData = {
      firstname: user.firstname || '',
      middlename: user.middlename || '',
      lastname: user.lastname || '',
      username: user.username || '',
      email: user.email || '',
      status: user.status || 'active',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      zipcode: user.zipcode || '',
      loyalty_points: Number(user.loyalty_points) || 0,
      loyalty_points_used: Number(user.loyalty_points_used) || 0,
    };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setSelectedUser({ user_id: user.user_id });
    setShowFormModal(true);
  };

  const handleDelete = async (user_id) => {
    const userToDelete = users.find((user) => user.user_id === user_id);
    if (!userToDelete) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'User not found.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'staff') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Staff users cannot delete other users.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'manager' && userToDelete.role === 'manager') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Managers cannot delete other managers.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    if (currentUserRole === 'admin' && userToDelete.role === 'admin') {
      Swal.fire({
        icon: 'warning',
        title: 'Restricted',
        text: 'Admin users cannot be deleted.',
        timer: 1500,
        showConfirmButton: false,
        background: '#f5f0eb',
        color: '#5e503f',
      });
      return;
    }
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d82a53',
      cancelButtonColor: '#2ec4b6',
      confirmButtonText: 'Yes, delete it!',
      background: '#f5f0eb',
      color: '#5e503f',
    });
    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        const response = await axios.post(
          API_URL,
          { action: 'delete_user', user_id },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: response.data.message || 'User deleted successfully',
            timer: 1500,
            showConfirmButton: false,
            background: '#f5f0eb',
            color: '#5e503f',
          });
          fetchUsers();
        } else {
          throw new Error(response.data.message || 'Failed to delete user');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || error.message || 'Failed to delete user',
          background: '#f5f0eb',
          color: '#5e503f',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeFormModal = () => {
    setFormData({
      firstname: '',
      middlename: '',
      lastname: '',
      username: '',
      email: '',
      status: 'active',
      phone: '',
      address: '',
      city: '',
      zipcode: '',
      loyalty_points: 0,
      loyalty_points_used: 0,
    });
    setOriginalFormData({});
    setSelectedUser(null);
    setShowFormModal(false);
  };

  const closeHistoryModal = () => {
    setSelectedUser(null);
    setShowHistoryModal(false);
    setCurrentPage(1);
  };

  return (
    <div className="user-container">
      <h1 className="user-title">User Management</h1>

      {/* Filter/Search, Sort, and Refresh Controls */ }
      <div className="user-controls-bar">
        <div className="user-search-container">
          <input
            type="text"
            className="user-search-input"
            placeholder="Search by name, username, or email..."
            value={ searchTerm }
            onChange={ (e) => setSearchTerm(e.target.value) }
            aria-label="Search users"
          />
          { searchTerm && (
            <button
              className="user-clear-search"
              onClick={ () => setSearchTerm('') }
              aria-label="Clear search"
            >
              <X size={ 16 } />
            </button>
          ) }
        </div>
        <select
          className="user-sort-select"
          value={ sortBy }
          onChange={ (e) => setSortBy(e.target.value) }
          aria-label="Sort users"
        >
          <option value="name">Sort by Name</option>
          <option value="role">Sort by Role</option>
          <option value="status">Sort by Status</option>
          <option value="loyalty_points">Sort by Loyalty Points</option>
        </select>
        <button
          className="user-btn user-btn-secondary user-refresh-btn"
          onClick={ fetchUsers }
          title="Refresh User List"
          aria-label="Refresh user list"
          disabled={ isLoading }
        >
          { isLoading ? 'Refreshing...' : 'Refresh' }
        </button>
      </div>

      {/* Error Message */ }
      { error && (
        <div className="user-error-message">
          { error }
          <button
            className="user-btn user-btn-secondary"
            onClick={ fetchUsers }
            aria-label="Retry fetching users"
          >
            Retry
          </button>
        </div>
      ) }

      {/* Loading State */ }
      { isLoading && (
        <div className="user-loading">
          <LoadingPage />
        </div>
      ) }

      {/* User List */ }
      { !isLoading && !error && (
        <div className="user-card-container">
          <div className="user-card-grid">
            { filteredUsers.length === 0 ? (
              <div className="user-no-results">No users found.</div>
            ) : (
              filteredUsers.map((user) => {
                if (!user || !user.user_id) return null;
                return (
                  <div className="user-card-item" key={ user.user_id }>
                    <div className="user-card-header">
                      <span className={ `user-badge user-badge-role user-badge-${user.role}` }>
                        { user.role.charAt(0).toUpperCase() + user.role.slice(1) }
                      </span>
                      <span className={ `user-badge user-badge-status user-badge-${user.status}` }>
                        { user.status.charAt(0).toUpperCase() + user.status.slice(1) }
                      </span>
                    </div>
                    <div className="user-card-body">
                      <div className="user-card-row"><strong>ID:</strong> { user.user_id }</div>
                      <div className="user-card-row"><strong>Name:</strong> { getFullName(user) || 'N/A' }</div>
                      <div className="user-card-row"><strong>Username:</strong> { user.username || 'N/A' }</div>
                      <div className="user-card-row"><strong>Email:</strong> { user.email || 'N/A' }</div>
                      <div className="user-card-row"><strong>Phone:</strong> { user.phone || 'N/A' }</div>
                      <div className="user-card-row"><strong>Address:</strong> { user.address || 'N/A' }</div>
                      <div className="user-card-row"><strong>Loyalty Points:</strong> { user.loyalty_points || 'N/A' }</div>
                      <div className="user-card-row"><strong>Loyalty Points Used:</strong> { user.loyalty_points_used || 'N/A' }</div>
                    </div>
                    <div className="user-actions-group user-card-actions">
                      <button
                        onClick={ () => handleEdit(user) }
                        className="user-btn user-btn-edit"
                        title="Edit User"
                        aria-label={ `Edit user ${getFullName(user)}` }
                        disabled={ isLoading }
                      >
                        <Edit size={ 16 } /> Edit
                      </button>
                      <button
                        onClick={ () => handleDelete(user.user_id) }
                        className="user-btn user-btn-delete"
                        title="Delete User"
                        aria-label={ `Delete user ${getFullName(user)}` }
                        disabled={ isLoading }
                      >
                        <Trash2 size={ 16 } /> Delete
                      </button>
                      { user.role === 'customer' && (
                        <button
                          onClick={ () => viewUserHistory(user.user_id) }
                          className="user-btn user-btn-history"
                          title="View History"
                          aria-label={ `View history for ${getFullName(user)}` }
                          disabled={ isLoading }
                        >
                          <History size={ 16 } /> History
                        </button>
                      ) }
                    </div>
                  </div>
                );
              })
            ) }
          </div>
        </div>
      ) }

      {/* User Edit Form Modal */ }
      { showFormModal && (
        <div className="user-modal-overlay" role="dialog" aria-labelledby="form-modal-title">
          <div className="user-modal-container">
            <div className="user-modal-content">
              <div className="user-modal-header">
                <h2 className="user-modal-title" id="form-modal-title">
                  Edit User
                </h2>
                <button
                  type="button"
                  className="user-close-button"
                  onClick={ closeFormModal }
                  aria-label="Close modal"
                >
                  <X size={ 20 } />
                </button>
              </div>
              <form className="user-form" onSubmit={ handleSubmit }>
                <div className="user-form-grid">
                  <div className="user-form-group">
                    <label htmlFor="firstname">First Name *</label>
                    <input
                      type="text"
                      id="firstname"
                      name="firstname"
                      value={ formData.firstname }
                      onChange={ handleInputChange }
                      required
                      aria-required="true"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="middlename">Middle Name</label>
                    <input
                      type="text"
                      id="middlename"
                      name="middlename"
                      value={ formData.middlename }
                      onChange={ handleInputChange }
                      placeholder="Enter middle name"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="lastname">Last Name *</label>
                    <input
                      type="text"
                      id="lastname"
                      name="lastname"
                      value={ formData.lastname }
                      onChange={ handleInputChange }
                      required
                      aria-required="true"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="username">Username *</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={ formData.username }
                      onChange={ handleInputChange }
                      required
                      aria-required="true"
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={ formData.email }
                      onChange={ handleInputChange }
                      required
                      aria-required="true"
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={ formData.status }
                      onChange={ handleInputChange }
                      aria-label="User status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={ formData.phone }
                      onChange={ handleInputChange }
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={ formData.address }
                      onChange={ handleInputChange }
                      placeholder="Enter address"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="city">City</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={ formData.city }
                      onChange={ handleInputChange }
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="zipcode">Zipcode</label>
                    <input
                      type="text"
                      id="zipcode"
                      name="zipcode"
                      value={ formData.zipcode }
                      onChange={ handleInputChange }
                      placeholder="Enter zipcode"
                    />
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="loyalty_points">Loyalty Points</label>
                    <p id="loyalty_points" className="static-field">
                      { formData.loyalty_points }
                    </p>
                  </div>
                  <div className="user-form-group">
                    <label htmlFor="loyalty_points_used">Loyalty Points Used</label>
                    <p id="loyalty_points_used" className="static-field">
                      { formData.loyalty_points_used }
                    </p>
                  </div>
                </div>
                <div className="user-actions">
                  <button
                    type="button"
                    className="user-btn user-btn-secondary"
                    onClick={ closeFormModal }
                    aria-label="Cancel"
                    disabled={ isLoading }
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="user-btn user-btn-primary"
                    disabled={ isLoading }
                  >
                    { isLoading ? 'Processing...' : 'Update User' }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) }

      {/* User History Modal */ }
      { showHistoryModal && selectedUser?.history && (
        <div className="user-modal-overlay" role="dialog" aria-labelledby="history-modal-title">
          <div className="user-modal-container">
            <div className="user-modal-content">
              <div className="user-modal-header">
                <h2 className="user-modal-title" id="history-modal-title">
                  User History (ID: { selectedUser.user_id })
                </h2>
                <button
                  type="button"
                  className="user-close-button"
                  onClick={ closeHistoryModal }
                  aria-label="Close modal"
                >
                  <X size={ 20 } />
                </button>
              </div>
              <div className="user-modal-body">
                { isLoading ? (
                  <LoadingPage />
                ) : selectedUser.history.length > 0 ? (
                  <>
                    <div className="user-table-responsive">
                      <table className="user-table">
                        <thead>
                          <tr>
                            <th>Order ID</th>
                            <th>Order Number</th>
                            <th>Status</th>
                            <th>Notes</th>
                            <th>Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          { selectedUser.history
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((entry) => (
                              <tr key={ entry.history_id }>
                                <td
                                  onClick={ () => toggleText(entry.history_id, 'order_id') }
                                  className="user-text-wrap"
                                  title="Click to toggle full text"
                                  role="button"
                                  tabIndex={ 0 }
                                  onKeyDown={ (e) => e.key === 'Enter' && toggleText(entry.history_id, 'order_id') }
                                >
                                  { expandedRows[`${entry.history_id}-order_id`]
                                    ? entry.order_id
                                    : `${entry.order_id?.toString().slice(0, 15)}...` }
                                </td>
                                <td
                                  onClick={ () => toggleText(entry.history_id, 'order_number') }
                                  className="user-text-wrap"
                                  title="Click to toggle full text"
                                  role="button"
                                  tabIndex={ 0 }
                                  onKeyDown={ (e) => e.key === 'Enter' && toggleText(entry.history_id, 'order_number') }
                                >
                                  { expandedRows[`${entry.history_id}-order_number`]
                                    ? entry.order_number
                                    : `${entry.order_number?.toString().slice(0, 15)}...` }
                                </td>
                                <td
                                  onClick={ () => toggleText(entry.history_id, 'status') }
                                  className="user-text-wrap"
                                  title="Click to toggle full text"
                                  role="button"
                                  tabIndex={ 0 }
                                  onKeyDown={ (e) => e.key === 'Enter' && toggleText(entry.history_id, 'status') }
                                >
                                  { expandedRows[`${entry.history_id}-status`]
                                    ? entry.status
                                    : `${entry.status?.toString().slice(0, 15)}...` }
                                </td>
                                <td
                                  onClick={ () => toggleText(entry.history_id, 'notes') }
                                  className="user-text-wrap"
                                  title="Click to toggle full text"
                                  role="button"
                                  tabIndex={ 0 }
                                  onKeyDown={ (e) => e.key === 'Enter' && toggleText(entry.history_id, 'notes') }
                                >
                                  { expandedRows[`${entry.history_id}-notes`]
                                    ? entry.notes || 'N/A'
                                    : `${(entry.notes || 'N/A').toString().slice(0, 15)}...` }
                                </td>
                                <td>{ new Date(entry.created_at).toLocaleString() }</td>
                              </tr>
                            )) }
                        </tbody>
                      </table>
                    </div>
                    <div className="user-actions user-pagination">
                      <button
                        className="user-btn user-btn-secondary"
                        onClick={ () => setCurrentPage((prev) => Math.max(prev - 1, 1)) }
                        disabled={ currentPage === 1 || isLoading }
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      <span className="user-badge user-badge-status">
                        Page { currentPage } of { Math.ceil(selectedUser.history.length / itemsPerPage) }
                      </span>
                      <button
                        className="user-btn user-btn-secondary"
                        onClick={ () =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, Math.ceil(selectedUser.history.length / itemsPerPage))
                          )
                        }
                        disabled={ currentPage === Math.ceil(selectedUser.history.length / itemsPerPage) || isLoading }
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="user-no-results">No history available for this user.</div>
                ) }
              </div>
            </div>
          </div>
        </div>
      ) }
    </div>
  );
};

export default UserManagement;
