import { callProtectedAPI, loginWithEmail, loginWithGoogle, logoutUser, registerWithGoogle } from '@utils/firebase';
import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  userData: null,
  loading: false,
  error: null,
  success: null,

  setAuth: (user, token) => {
    set({
      isAuthenticated: !!user,
      userData: user,
    });

    if (user?.role === 'customer') {
      localStorage.setItem('token', token);
      localStorage.setItem('customer', JSON.stringify(user));
      localStorage.setItem('userRole', user.role);
    } else if (['admin', 'staff', 'manager'].includes(user.role)) {
      localStorage.setItem('tokenadmin', token);
      localStorage.setItem('adminstaff', JSON.stringify(user));
      localStorage.setItem('adminRole', user.role);
    }
  },

  clearAuth: () => {
    set({
      isAuthenticated: false,
      userData: null,
    });
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tokenadmin');
    localStorage.removeItem('adminstaff');
    localStorage.removeItem('adminRole');
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, success: null }),
  setSuccess: (success) => set({ success, error: null }),
  clearMessages: () => set({ error: null, success: null }),

  checkAuthStatus: async () => {
    const currentState = get();
    let user = null;
    let token = null;

    const userToken = localStorage.getItem('token');
    const adminToken = localStorage.getItem('tokenadmin');

    if (userToken || adminToken) {
      try {
        const activeToken = userToken || adminToken;
        const response = await callProtectedAPI(activeToken, 'check-auth');

        if (response.success && response.user) {
          user = response.user;
          token = activeToken;

          if (user.role === 'customer') {
            if (userToken !== token) {
              localStorage.setItem('token', token);
              localStorage.setItem('customer', JSON.stringify(user));
              localStorage.setItem('userRole', user.role);
            }
          } else if (['admin', 'staff', 'manager'].includes(user.role)) {
            if (adminToken !== token) {
              localStorage.setItem('tokenadmin', token);
              localStorage.setItem('adminstaff', JSON.stringify(user));
              localStorage.setItem('adminRole', user.role);
            }
          }

          set({ isAuthenticated: true, userData: user });
          return true;
        } else {
          get().clearAuth();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        get().clearAuth();
      }
    }

    if (currentState.isAuthenticated || currentState.userData) {
      set({ isAuthenticated: false, userData: null });
    }
    return false;
  },

  loginUser: async (email, password, rememberMe) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await loginWithEmail(email, password);

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (user.role !== 'customer') {
          throw new Error('Invalid role: User must be a customer');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('token', token);
        localStorage.setItem('customer', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Login successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/index',
        };
      } else {
        set({ error: response.message || 'Login failed.', loading: false });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('User login error:', err);
      const errorMessage = err.message || 'Login failed. Please check your connection or try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await loginWithGoogle();

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (user.role !== 'customer') {
          throw new Error('Invalid role: Google login is for customers only');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('token', token);
        localStorage.setItem('customer', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Google login successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/index',
        };
      } else {
        set({ error: response.message || 'Google login failed.', loading: false });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('Google login error:', err);
      const errorMessage = err.message || 'Google login failed. Please try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  registerWithGoogle: async () => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await registerWithGoogle();

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (user.role !== 'customer') {
          throw new Error('Invalid role: Google sign-up is for customers only');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('token', token);
        localStorage.setItem('customer', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Google sign-up successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/index',
        };
      } else {
        set({ error: response.message || 'Google sign-up failed.', loading: false });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('Google sign-up error:', err);
      const errorMessage = err.message || 'Google sign-up failed. Please try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  loginAdmin: async (email, password, rememberMe = false) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await loginWithEmail(email, password);

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (!['admin', 'staff', 'manager'].includes(user.role)) {
          throw new Error('Invalid role: User must be admin, staff, or manager');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('tokenadmin', token);
        localStorage.setItem('adminstaff', JSON.stringify(user));
        localStorage.setItem('adminRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Login successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/dashboard',
        };
      } else {
        set({ error: response.message || 'Login failed.', loading: false });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('Admin/Staff login error:', err);
      const errorMessage = err.message || 'Login failed. Please check your connection or try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  logoutUser: async () => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await logoutUser();

      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenadmin');
      localStorage.removeItem('adminstaff');
      localStorage.removeItem('adminRole');

      set({
        isAuthenticated: false,
        userData: null,
        loading: false,
        success: response.message || 'Logout successful!',
      });

      return { success: true };
    } catch (error) {
      console.error('User logout error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenadmin');
      localStorage.removeItem('adminstaff');
      localStorage.removeItem('adminRole');

      set({
        isAuthenticated: false,
        userData: null,
        loading: false,
        error: error.message || 'Logout had errors but completed.',
      });

      return { success: true, hadErrors: true };
    }
  },

  logoutAdmin: async () => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await logoutUser();

      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenadmin');
      localStorage.removeItem('adminstaff');
      localStorage.removeItem('adminRole');

      set({
        isAuthenticated: false,
        userData: null,
        loading: false,
        success: response.message || 'Logout successful!',
      });

      return { success: true };
    } catch (error) {
      console.error('Admin logout error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenadmin');
      localStorage.removeItem('adminstaff');
      localStorage.removeItem('adminRole');

      set({
        isAuthenticated: false,
        userData: null,
        loading: false,
        error: error.message || 'Logout had errors but completed.',
      });

      return { success: true, hadErrors: true };
    }
  },

  registerUser: async (registerData) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await callProtectedAPI(null, 'register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'customer', ...registerData }),
      });

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (user.role !== 'customer') {
          throw new Error('Invalid role: User must be a customer');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('token', token);
        localStorage.setItem('customer', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Registration successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/index',
        };
      } else {
        set({
          error: response.message || 'Registration failed.',
          loading: false,
        });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('User registration error:', err);
      const errorMessage = err.message || 'Registration failed. Please check your connection or try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },

  registerAdmin: async (registerData) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await callProtectedAPI(null, 'register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...registerData }),
      });

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        if (!['admin', 'staff', 'manager'].includes(user.role)) {
          throw new Error('Invalid role: User must be admin, staff, or manager');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('customer');
        localStorage.removeItem('userRole');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        localStorage.removeItem('adminRole');

        localStorage.setItem('tokenadmin', token);
        localStorage.setItem('adminstaff', JSON.stringify(user));
        localStorage.setItem('adminRole', user.role);

        set({
          isAuthenticated: true,
          userData: user,
          loading: false,
          success: 'Registration successful!',
        });

        return {
          success: true,
          user,
          redirectTo: '/loginadmin',
        };
      } else {
        set({
          error: response.message || 'Registration failed.',
          loading: false,
        });
        return { success: false, message: response.message };
      }
    } catch (err) {
      console.error('Admin registration error:', err);
      const errorMessage = err.message || 'Registration failed. Please check your connection or try again later.';
      set({ error: errorMessage, loading: false });
      return { success: false, message: errorMessage };
    }
  },
}));

export default useAuthStore;
