import axios from 'axios';
import { create } from 'zustand';

const useAuthProfileStore = create((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  success: null,
  orderHistory: [],

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  clearMessages: () => set({ error: null, success: null }),

  fetchProfile: async (token) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.get('/api/core.php', {
        params: { action: 'get-profile' },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        set({ profile: response.data.profile, loading: false });
        return response.data.profile;
      } else {
        throw new Error(response.data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch profile';
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (token, profileData) => {
    try {
      set({ loading: true, error: null });
      const response = await axios.post(
        '/api/core.php',
        {
          action: 'update-profile',
          ...profileData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        set({
          profile: response.data.profile,
          success: 'Profile updated successfully',
          loading: false,
        });
        return response.data.profile;
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to update profile';
      set({
        error: errorMessage,
        loading: false,
      });
      throw new Error(errorMessage);
    }
  },



  createUser: async (token, userData) => {
    try {
      set({ loading: true, error: null, success: null });
      const payload = {
        action: 'create_user',
        ...userData,
      };
      const response = await axios.post(
        '/api/core.php',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        set({
          success: response.data.message || 'User created successfully',
          loading: false,
        });
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create user');
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create user';
      set({
        error: errorMessage,
        loading: false,
      });
      if (error.response?.status === 401 || error.response?.status === 403) {
        window.location.href = '/loginadmin';
      }
      throw new Error(errorMessage);
    }
  },
}));


export default useAuthProfileStore;
