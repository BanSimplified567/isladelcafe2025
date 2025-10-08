import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './layouts';

// Lazy-loaded components for better performance
const Login = lazy(() => import('@pages/user/Login'));
const LogInAdmin = lazy(() => import('@pages/admin/LogIn_Admin'));
const RegisterUser = lazy(() => import('@pages/user/RegisterUsers'));
const RegisterAdmin = lazy(() => import('@pages/admin/RegisterAdmin'));
const ForgotPasswordAdmin = lazy(() => import('@pages/admin/ForgotPasswordAdmin'));
const ForgotPassword = lazy(() => import('@pages/user/ForgotPassword'));
const Index = lazy(() => import('@pages/user/Index'));
const MenuPage = lazy(() => import('@pages/user/Menu'));
const About = lazy(() => import('@pages/user/About'));
const Contact = lazy(() => import('@pages/user/Contact'));
const Checkout = lazy(() => import('@pages/user/Checkout'));
const ProductDetails = lazy(() => import('@pages/user/ProductDetails'));
const Profile = lazy(() => import('@pages/user/Profile'));
const Cart = lazy(() => import('@pages/user/Cart'));
const Inventory = lazy(() => import('@pages/admin/ProductAndInventoryManagement/Inventory'));
const Products = lazy(() => import('@pages/admin/ProductAndInventoryManagement/Products'));
const UserManagement = lazy(() => import('@pages/admin/UserManagement/UserManagement'));
const Dashboard = lazy(() => import('@pages/admin/Dashboard'));
const Feedback = lazy(() => import('@pages/admin/Feedback'));
const Reports = lazy(() => import('@pages/admin/Reports'));
const Settings = lazy(() => import('@pages/admin/Settings'));
const Orders = lazy(() => import('@pages/admin/Orders'));
const OrderDetails = lazy(() => import('@pages/admin/OrderDetails'));
const OrderHistory = lazy(() => import('@pages/admin/OrderAndHistory/OrderHistory'));
const NotFound = lazy(() => import('@pages/Notfound'));







import ProtectedRoute from '@components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      // Public routes
      { index: true, element: <Login /> },
      { path: 'loginadmin', element: <LogInAdmin /> },
      { path: 'registeradmin', element: <RegisterAdmin /> },
      { path: 'forgot-password-admin', element: <ForgotPasswordAdmin /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'registerusers', element: <RegisterUser /> },

      // Customer routes
      {
        path: 'index',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><Index /></ProtectedRoute>,
      },
      {
        path: 'menu',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><MenuPage /></ProtectedRoute>,
      },
      {
        path: 'about',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><About /></ProtectedRoute>,
      },
      {
        path: 'contact',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><Contact /></ProtectedRoute>,
      },
      {
        path: 'checkout',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><Checkout /></ProtectedRoute>,
      },
      {
        path: 'product/:id',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><ProductDetails /></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><Profile /></ProtectedRoute>,
      },
      {
        path: 'cart',
        element: <ProtectedRoute allowedRoles={ ['customer'] }><Cart /></ProtectedRoute>,
      },

      // Admin/Manager routes
      {
        path: 'inventory',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager'] }><Inventory /></ProtectedRoute>,
      },
      {
        path: 'feedback',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager'] }><Feedback /></ProtectedRoute>,
      },
      {
        path: 'reports',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager'] }><Reports /></ProtectedRoute>,
      },
      {
        path: 'products',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager'] }><Products /></ProtectedRoute>,
      },
      {
        path: 'users',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager'] }><UserManagement /></ProtectedRoute>,
      },

      // Admin/Manager/Staff routes
      {
        path: 'dashboard',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager', 'staff'] }><Dashboard /></ProtectedRoute>,
      },
      {
        path: 'settings',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager', 'staff'] }><Settings /></ProtectedRoute>,
      },
      {
        path: 'orders',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager', 'staff'] }><Orders /></ProtectedRoute>,
      },
      {
        path: 'orders/:orderId',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager', 'staff'] }><OrderDetails /></ProtectedRoute>,
      },
      {
        path: 'order-history',
        element: <ProtectedRoute allowedRoles={ ['admin', 'manager', 'staff'] }><OrderHistory /></ProtectedRoute>,
      },

      // Catch-all route
      { path: '*', element: <NotFound /> },
    ],
  },
]);
