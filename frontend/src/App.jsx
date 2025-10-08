import LoadingPage from '@components/LoadingPage';
import useAuthStore from '@store/authStore';
import useProductStore from '@store/useProductStore';
import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';


function App() {
  const checkAuthStatus = useAuthStore((state) => state.checkAuthStatus);
  const fetchProducts = useProductStore((state) => state.fetchProducts);

  useEffect(() => {
    const isValid = checkAuthStatus();
    if (!isValid) {
      localStorage.removeItem('token');
      localStorage.removeItem('customer');
      localStorage.removeItem('userRole');
      localStorage.removeItem('tokenadmin');
      localStorage.removeItem('adminstaff');
      localStorage.removeItem('adminRole');
    }
    fetchProducts();
  }, [checkAuthStatus, fetchProducts]);

  return (
    <Suspense fallback={ <LoadingPage /> }>
      <RouterProvider router={ router } />
    </Suspense>
  );
}

export default App;
