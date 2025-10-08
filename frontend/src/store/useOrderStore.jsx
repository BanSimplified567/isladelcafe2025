import axios from 'axios';
import Swal from 'sweetalert2';
import { create } from 'zustand';
import useAuthStore from './authStore';

const API_ORDER = '/api/core.php';

export const useOrderStore = create((set, get) => ({
  orders: [],
  order: null,
  orderItems: [],
  loading: true,
  loadingItems: false,
  updatingStatus: null,
  pagination: {
    currentPage: 1,
    ordersPerPage: 10,
    totalOrders: 0,
    totalPages: 0,
  },
  searchQuery: '',
  debounceTimeout: null,

  // Fetch all orders with pagination and search
  fetchOrders: async (page = 1, limit = 10, searchQuery = '') => {
    try {
      set({ loading: true });
      const response = await axios.get(`${API_ORDER}?action=order_fetch`, {
        params: {
          page,
          limit,
          search: searchQuery,
        },
      });

      if (response.data.success) {
        set({
          orders: response.data.orders || [],
          pagination: {
            currentPage: page,
            ordersPerPage: limit,
            totalOrders: response.data.total_orders || 0,
            totalPages: Math.ceil((response.data.total_orders || 0) / limit),
          },
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err, { response: err.response?.data });
      Swal.fire({
        icon: 'error',
        title: 'Fetch Error',
        text: 'Unable to load orders. Please try again.',
      });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch single order details
  fetchOrderDetails: async (orderId) => {
    try {
      set({ loading: true });
      const response = await axios.get(`${API_ORDER}?action=order_fetch&order_id=${orderId}`);
      if (response.data.success && response.data.order) {
        set({ order: response.data.order });
      } else {
        throw new Error(response.data.message || 'Failed to fetch order details');
      }
    } catch (err) {
      console.error('Error fetching order details:', err, { response: err.response?.data });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load order details. Please try again.',
      });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch order items
  fetchOrderItems: async (orderId) => {
    try {
      set({ loadingItems: true });
      const response = await axios.get(`${API_ORDER}`, {
        params: {
          action: 'order_items',
          order_id: orderId,
        },
      });
      if (response.data.success) {
        set({ orderItems: response.data.items || [] });
      } else {
        throw new Error(response.data.message || 'Failed to fetch order items');
      }
    } catch (err) {
      console.error('Error fetching order items:', err, { response: err.response?.data });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to load order items. Please try again.',
      });
    } finally {
      set({ loadingItems: false });
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, newStatus, currentStatus, notes = 'Status updated') => {
    if (get().updatingStatus === orderId) return;

    // Validate status transition
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

    const validOptions = validTransitions[currentStatus] || [];
    if (!validOptions.includes(newStatus)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Status Transition',
        text: `Cannot change status from ${currentStatus} to ${newStatus}`,
      });
      return;
    }

    // Show confirmation for cancellation or status change
    const result = await Swal.fire({
      title: newStatus === 'Cancelled' ? 'Confirm Cancellation' : 'Are you sure?',
      text:
        newStatus === 'Cancelled'
          ? 'Are you sure you want to cancel this order? This will restore inventory and deduct loyalty points if used.'
          : `Change status from ${currentStatus} to ${newStatus}?`,
      icon: newStatus === 'Cancelled' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Cancelled' ? '#d33' : '#3085d6',
      cancelButtonColor: newStatus === 'Cancelled' ? '#3085d6' : '#d33',
      confirmButtonText: newStatus === 'Cancelled' ? 'Yes, cancel order' : 'Yes, update it!',
    });

    if (!result.isConfirmed) return;

    try {
      set({ updatingStatus: orderId });

      const { currentUser } = useAuthStore.getState();

      const response = await axios.post(
        `${API_ORDER}`,
        {
          action: 'order_update_status',
          order_id: orderId,
          status: newStatus,
          admin_id: currentUser?.user_id,
          notes,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.order_id === orderId ? { ...order, status: newStatus } : order
          ),
          order:
            state.order && state.order.order_id === orderId
              ? { ...state.order, status: newStatus }
              : state.order,
        }));

        const successMessage =
          newStatus === 'Cancelled'
            ? 'Order cancelled successfully. Inventory restored and loyalty points deducted.'
            : `Order status updated to ${newStatus}`;

        Swal.fire({
          icon: 'success',
          title: 'Status Updated',
          text: successMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        throw new Error(response.data.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating status:', err, { response: err.response?.data });
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to update order status. Please try again.',
      });
    } finally {
      set({ updatingStatus: null });
    }
  },

  // Delete order
  // In useOrderStore.js, replace the deleteOrder function:
  deleteOrder: async (orderId, itemsCount) => {
    const { currentUser } = useAuthStore.getState();
    if (currentUser?.role === 'staff') {
      Swal.fire({
        icon: 'error',
        title: 'Permission Denied',
        text: 'Staff accounts cannot delete orders.',
      });
      return false;
    }

    try {
      const result = await Swal.fire({
        title: 'Confirm Delete',
        text: itemsCount === 0
          ? 'This order has no items and will be permanently deleted from the database. Continue?'
          : 'This order will be removed from the list but kept in the database. Continue?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Delete Order',
      });

      if (result.isConfirmed) {
        if (itemsCount === 0) {
          // Delete from database for orders with 0 items
          const response = await axios.delete(`${API_ORDER}?action=order_delete&order_id=${orderId}`);
          if (response.data.success) {
            set((state) => ({
              orders: state.orders.filter((order) => order.order_id !== orderId),
              order: state.order && state.order.order_id === orderId ? null : state.order,
              orderItems: state.order && state.order.order_id === orderId ? [] : state.orderItems,
            }));
            Swal.fire({
              icon: 'success',
              title: 'Order Deleted',
              text: 'Order has been permanently deleted from the database.',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
            });
            return true;
          } else {
            throw new Error(response.data.message || 'Failed to delete order');
          }
        } else {
          // Remove from frontend list only for orders with items
          set((state) => ({
            orders: state.orders.filter((order) => order.order_id !== orderId),
            order: state.order && state.order.order_id === orderId ? null : state.order,
            orderItems: state.order && state.order.order_id === orderId ? [] : state.orderItems,
          }));
          Swal.fire({
            icon: 'success',
            title: 'Order Removed',
            text: 'Order has been removed from the list.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
          });
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error deleting order:', err, { response: err.response?.data });
      Swal.fire({
        icon: 'error',
        title: 'Deletion Failed',
        text: err.response?.data?.message || 'Failed to delete order. Please try again.',
      });
      return false;
    }
  },
  // Update search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },


  // Update pagination
  setPagination: (page) => {
    set((state) => ({
      pagination: { ...state.pagination, currentPage: page },
    }));
  },
}));

export default useOrderStore;
