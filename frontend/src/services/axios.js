// api/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api", // centralized
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Add token automatically if found
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || localStorage.getItem("tokenadmin");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
