import IslaDelCafe from '@assets/IslaDelCafeBackground.jpg';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import useAuthStore from '@store/authStore';
import '@style/Login.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function LoginAdmin() {
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [rememberMe, setRememberMe] = useState(false);
   const [formErrors, setFormErrors] = useState({});
   const navigate = useNavigate();
   const { loginAdmin, loading } = useAuthStore();

   // Load saved credentials if "Remember Me" was checked previously
   useEffect(() => {
      const savedUsername = localStorage.getItem('adminUsername');
      const savedPassword = localStorage.getItem('adminPassword');
      if (savedUsername && savedPassword) {
         setUsername(savedUsername);
         setPassword(savedPassword);
         setRememberMe(true);
      }
   }, []);

   const validateForm = useCallback(() => {
      const errors = {};
      if (!username.trim()) {
         errors.username = 'Username is required';
      } else if (username.length < 3) {
         errors.username = 'Username must be at least 3 characters';
      }
      if (!password) {
         errors.password = 'Password is required';
      } else if (password.length < 6) {
         errors.password = 'Password must be at least 6 characters';
      }
      return errors;
   }, [username, password]);

   const handleSubmit = async (e) => {
      e.preventDefault();
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
         setFormErrors(errors);
         return;
      }
      setFormErrors({});

      try {
         const response = await loginAdmin(username, password);
         if (response.success) {
            // Save credentials if "Remember Me" is checked
            if (rememberMe) {
               localStorage.setItem('adminUsername', username);
               localStorage.setItem('adminPassword', password);
            } else {
               // Clear saved credentials if "Remember Me" is not checked
               localStorage.removeItem('adminUsername');
               localStorage.removeItem('adminPassword');
            }

            // Dispatch custom event for navbar (mainly for user-focused components)
            window.dispatchEvent(new Event('adminLogin'));

            await Swal.fire({
               icon: 'success',
               title: 'Login Successful',
               text: 'You have successfully logged in!',
               timer: 2000,
               showConfirmButton: false,
            });
            navigate(response.redirectTo, { replace: true });
         } else {
            Swal.fire({
               icon: 'error',
               title: 'Login Failed',
               text: response.message || 'Invalid username or password',
               confirmButtonColor: '#3085d6',
               confirmButtonText: 'Try Again',
            });
         }
      } catch (err) {
         console.error('Login error:', err);
         const errorMessage =
            err.message === 'Network Error'
               ? 'Network error. Please check your connection and try again.'
               : err.message || 'Invalid username or password';
         Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: errorMessage,
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Try Again',
         });
      }
   };

   const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
   };

   return (
      <div className="loginAdminContainer">
         <div className="loginImageContainer">
            <img className="loginIsladelCafe" src={IslaDelCafe} alt="IslaDelCafe" />
         </div>

         <div className="loginAdminCard">
            <div className="loginAdminHeader">
               <h1 className="loginAdminTitle">Isla del Cafe</h1>
               <p className="loginAdminSubtitle">Welcome Sign in to your account</p>
            </div>

            <form className="loginAdminForm" onSubmit={handleSubmit}>
               <div className="loginAdminFormGroup">
                  <label htmlFor="username" className="loginAdminLabel">
                     Username
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                     <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        className={`loginAdminInput ${formErrors.username ? 'error' : ''}`}
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                     />
                  </div>
                  {formErrors.username && (
                     <span className="loginAdminError">{formErrors.username}</span>
                  )}
               </div>

               <div className="loginAdminFormGroup">
                  <label htmlFor="password" className="loginAdminLabel">
                     Password
                  </label>
                  <div className="loginAdminPasswordWrapper">
                     <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                           id="password"
                           name="password"
                           type={showPassword ? 'text' : 'password'}
                           required
                           className={`loginAdminInput ${formErrors.password ? 'error' : ''}`}
                           placeholder="Enter your password"
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           disabled={loading}
                        />
                     </div>
                     <button
                        type="button"
                        className="loginAdminPasswordToggle"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={loading}
                     >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                     </button>
                  </div>
                  {formErrors.password && (
                     <span className="loginAdminError">{formErrors.password}</span>
                  )}
               </div>

               <div className="loginAdminOptions">
                  <div className="loginAdminRemember">
                     <input
                        type="checkbox"
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                     />
                     <label className='loginAdminLabel' htmlFor="rememberMe">Remember me</label>
                  </div>
                  <div className="loginAdminForgot">
                     <button
                        type="button"
                        onClick={() => navigate('/forgot-password-admin')}
                        className="loginAdminLink"
                     >
                        Forgot your password?
                     </button>
                  </div>
               </div>

               <button type="submit" disabled={loading} className="loginAdminButton">
                  {loading ? (
                     <div className="loginAdminButtonLoading">
                        <div className="loginAdminSpinner"></div>
                        <span>Signing in...</span>
                     </div>
                  ) : (
                     'Sign In'
                  )}
               </button>
            </form>

            <div className="loginAdminFooter">
               <button
                  type="button"
                  onClick={() => navigate('/registeradmin')}
                  className="loginAdminLink"
                  disabled={loading}
               >
                  Don't have an account? Sign Up
               </button>
            </div>
         </div>
      </div>
   );
}

export default LoginAdmin;
