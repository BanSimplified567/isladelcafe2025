import LoadingPage from '@components/LoadingPage';
import useAuthStore from '@store/authStore';
import '@style/settings.css';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

const Settings = () => {
  const { userData, setError, clearMessages, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setLocalError] = useState('');
  const [originalProfile, setOriginalProfile] = useState(null);
  const [profile, setProfile] = useState({
    username: userData?.username || '',
    email: userData?.email || '',
    firstname: '',
    middlename: '',
    lastname: '',
    phone: '',
    address: '',
    city: '',
    zipcode: '',
    profileicon: '',
    created_at: '',
  });
  const [profileIconFile, setProfileIconFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('tokenadmin');
      if (!token) throw new Error('Missing authentication token');
      if (!userData || !userData.user_id) throw new Error('Invalid user session');

      const profileResponse = await axios.get('/api/core.php', {
        params: { action: 'fetch_user_details', user_id: userData.user_id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      if (!profileResponse.data.success) {
        throw new Error(profileResponse.data.message || 'Failed to fetch profile');
      }

      const userDataResponse = profileResponse.data.data.profile;
      const fetchedProfile = {
        username: userDataResponse.username || '',
        email: userDataResponse.email || '',
        firstname: userDataResponse.firstname || '',
        middlename: userDataResponse.middlename || '',
        lastname: userDataResponse.lastname || '',
        role: userDataResponse.role || '',
        phone: userDataResponse.phone || '',
        address: userDataResponse.address || '',
        city: userDataResponse.city || '',
        zipcode: userDataResponse.zipcode || '',
        profileicon: userDataResponse.profileicon
          ? `/api/serve_image.php?type=profile&image=${encodeURIComponent(userDataResponse.profileicon)}`
          : 'https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-chat/ava3.webp',
        created_at: userDataResponse.created_at || '',
      };
      setProfile(fetchedProfile);
      setOriginalProfile(fetchedProfile);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setLocalError('Session expired. Please log in again.');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
      } else {
        const errorMessage = err.response?.data?.message || 'Failed to load profile data';
        setError(errorMessage);
        setLocalError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [userData, setError]);

  useEffect(() => {
    if (userData && userData.user_id) {
      fetchProfileData();
    }
  }, [userData, fetchProfileData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    clearMessages();
    setLocalError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setLocalError('Profile icon must be an image (e.g., PNG, JPG)');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setLocalError('Profile icon file size must be under 2MB');
        return;
      }
      setProfileIconFile(file);
      setProfile((prev) => ({
        ...prev,
        profileicon: URL.createObjectURL(file),
      }));
      clearMessages();
      setLocalError('');
    }
  };

  const validateForm = () => {
    const errors = [];

    // --- Username ---
    if (!profile.username.trim()) {
      errors.push('• Username is required');
    }

    // --- Email ---
    if (!profile.email.trim()) {
      errors.push('• Email is required');
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(profile.email)) {
      errors.push('• Email must be a valid Gmail address ending with @gmail.com');
    }

    // --- Names (must contain only letters and spaces) ---
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!profile.firstname.trim()) {
      errors.push('• First name is required');
    } else if (!nameRegex.test(profile.firstname)) {
      errors.push('• First name must contain only letters');
    }

    if (profile.middlename && !nameRegex.test(profile.middlename)) {
      errors.push('• Middle name must contain only letters');
    }

    if (!profile.lastname.trim()) {
      errors.push('• Last name is required');
    } else if (!nameRegex.test(profile.lastname)) {
      errors.push('• Last name must contain only letters');
    }

    // --- City (optional but must be text only if provided) ---
    if (profile.city && !nameRegex.test(profile.city)) {
      errors.push('• City name must contain only letters');
    }

    // --- Phone (must be numeric, 10–12 digits, optional +) ---
    if (!profile.phone.trim()) {
      errors.push('• Phone number is required');
    } else if (!/^\+?\d{10,12}$/.test(profile.phone)) {
      errors.push('• Phone number must be 10–12 digits (numbers only)');
    }

    // --- ZIP Code (optional but must be 4–5 digits if filled) ---
    if (profile.zipcode && !/^\d{4,5}$/.test(profile.zipcode)) {
      errors.push('• ZIP code must be 4–5 digits');
    }

    // --- If any errors found, show SweetAlert and stop submission ---
    if (errors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Input',
        html: errors.join('<br>'),
        confirmButtonText: 'OK',
        customClass: {
          popup: 'swal-popup',
          title: 'swal-title',
          content: 'swal-text',
        },
      });
      return false;
    }

    return true;
  };

  const hasChanges = () => {
    if (!originalProfile) return true;
    return (
      profile.username !== originalProfile.username ||
      profile.email !== originalProfile.email ||
      profile.firstname !== originalProfile.firstname ||
      profile.middlename !== originalProfile.middlename ||
      profile.lastname !== originalProfile.lastname ||
      profile.phone !== originalProfile.phone ||
      profile.address !== originalProfile.address ||
      profile.city !== originalProfile.city ||
      profile.zipcode !== originalProfile.zipcode ||
      profileIconFile !== null
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearMessages();
    setLocalError('');

    if (!hasChanges() && profile.username === originalProfile.username) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to your profile.',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'swal-popup',
          title: 'swal-title',
          content: 'swal-text',
        },
      });
      setIsSubmitting(false);
      return;
    }

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('tokenadmin');
      if (!token) {
        setError('No authentication token found');
        setLocalError('Please log in to update your profile');
        window.location.href = '/';
        return;
      }

      const fullname = `${profile.firstname} ${profile.middlename ? profile.middlename + ' ' : ''}${profile.lastname}`.trim();

      const formData = new FormData();
      formData.append('user_id', userData.user_id);
      formData.append('username', profile.username);
      formData.append('email', profile.email);
      formData.append('fullname', fullname);
      formData.append('firstname', profile.firstname);
      formData.append('middlename', profile.middlename || '');
      formData.append('lastname', profile.lastname);
      formData.append('phone', profile.phone);
      formData.append('address', profile.address);
      formData.append('city', profile.city);
      formData.append('zipcode', profile.zipcode);
      if (profileIconFile) {
        formData.append('profileicon', profileIconFile);
      }

      const response = await axios.post(
        '/api/core.php?action=update_user',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000,
        }
      );

      if (!response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Profile updated successfully!',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'swal-popup',
            title: 'swal-title',
            content: 'swal-text',
          },
        });

        const updatedData = response.data.data || {};

        // Safely process profileicon
        let processedProfileIcon = profile.profileicon;
        if (updatedData.profileicon) {
          try {
            const iconName = updatedData.profileicon.includes('/')
              ? updatedData.profileicon.split('/').pop()
              : updatedData.profileicon;
            processedProfileIcon = `/api/serve_image.php?type=profile&image=${encodeURIComponent(iconName)}`;
          } catch (e) {
            console.warn('Error processing profile icon:', e);
            processedProfileIcon = profile.profileicon;
          }
        }

        const updatedProfile = {
          ...profile,
          username: updatedData.username || profile.username,
          email: updatedData.email || profile.email,
          firstname: updatedData.firstname || profile.firstname,
          middlename: updatedData.middlename || profile.middlename,
          lastname: updatedData.lastname || profile.lastname,
          phone: updatedData.phone || profile.phone,
          address: updatedData.address || profile.address,
          city: updatedData.city || profile.city,
          zipcode: updatedData.zipcode || profile.zipcode,
          profileicon: processedProfileIcon,
          created_at: updatedData.created_at || profile.created_at,
        };
        setProfile(updatedProfile);
        setOriginalProfile(updatedProfile);
        setProfileIconFile(null);

        const updatedUser = {
          ...userData,
          username: updatedData.username || profile.username,
          email: updatedData.email || profile.email,
          firstname: updatedData.firstname || profile.firstname,
          lastname: updatedData.lastname || profile.lastname,
          full_name: fullname,
        };
        localStorage.setItem('adminstaff', JSON.stringify(updatedUser));
        setAuth(updatedUser, token);

        setIsEditing(false);
      } else {
        throw new Error('User already exist');
      }
    } catch (err) {
      let errorMessage =
        err.response?.data?.message || err.message || 'Failed to update profile';

      if (err.response?.status === 409) {
        errorMessage = 'Username already exists. Please choose a different one.';
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setLocalError('Session expired. Please log in again.');
        localStorage.removeItem('tokenadmin');
        localStorage.removeItem('adminstaff');
        window.location.href = '/';
        return;
      } else if (err.response?.status === 400 && errorMessage.includes('Invalid profile icon')) {
        errorMessage = 'Invalid profile icon file. Please upload a valid image.';
      }

      setError(errorMessage);
      setLocalError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: 'swal-popup',
          title: 'swal-title',
          content: 'swal-text',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageClick = () => {
    if (isEditing && !isSubmitting) {
      fileInputRef.current.click();
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="settings-section">
      <div className="settings-container">
        <div className="settings-header">
          <h1 className="settings-title">
            <i className="bi bi-gear-fill me-3"></i>
            Account Settings
          </h1>
          <p className="settings-subtitle">Manage your profile and preferences</p>
        </div>
        { error && (
          <div className="settings-error-alert">
            <div className="settings-error-content">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              { error }
              <button
                type="button"
                className="settings-error-close"
                onClick={ () => setLocalError('') }
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        ) }
        <div className="settings-content-row">
          <div className="settings-left-column">
            <div className="settings-profile-card">
              <div className="settings-profile-card-body">
                <div className="settings-profile-upload">
                  <div
                    className={ `settings-profile-upload-btn ${isEditing && !isSubmitting ? 'active' : ''}` }
                    onClick={ handleImageClick }
                  >
                    <img
                      src={ profile.profileicon || '/placeholder.svg' }
                      alt="Profile"
                      className="settings-profile-icon"
                    />
                    { isEditing && !isSubmitting && (
                      <div className="settings-profile-overlay">
                        <i className="bi bi-camera"></i>
                      </div>
                    ) }
                  </div>
                  <input
                    type="file"
                    name="profileicon"
                    ref={ fileInputRef }
                    onChange={ handleFileChange }
                    className="settings-profile-icon-input"
                    disabled={ !isEditing || isSubmitting }
                    accept="image/*"
                  />
                </div>
                <h4 className="settings-profile-name">
                  { profile.firstname } { profile.lastname }
                </h4>
                <p className="settings-profile-role">
                  <i className="bi bi-person-badge me-1"></i>
                  { profile.role }
                </p>
                <p className="settings-profile-location">
                  <i className="bi bi-geo-alt me-1"></i>
                  { profile.city ? `${profile.city}, ` : '' }Philippines
                </p>
                <div className="settings-profile-buttons">
                  <button
                    type="button"
                    className={ `settings-edit-profile-btn ${isEditing ? 'settings-cancel-btn' : ''}` }
                    onClick={ () => {
                      setIsEditing(!isEditing);
                      setLocalError('');
                      if (!isEditing) setProfileIconFile(null);
                    } }
                    disabled={ isSubmitting }
                  >
                    <i className={ `bi ${isEditing ? 'bi-x-lg' : 'bi-pencil'} me-2` }></i>
                    { isEditing ? 'Cancel' : 'Edit Profile' }
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="settings-right-column">
            <div className="settings-right-card">
              <div className="settings-card-header">
                <h5 className="settings-card-title">
                  <i className="bi bi-person-lines-fill me-2"></i>
                  Personal Information
                </h5>
              </div>
              <div className="settings-right-card-body">
                <form onSubmit={ handleSubmit } className="settings-profile-form">
                  <div className="settings-profile-row">
                    <label className="settings-profile-label">Full Name</label>
                    <div className="settings-profile-input-column">
                      { isEditing ? (
                        <div className="settings-profile-input-row">
                          <div className="settings-profile-input-subcolumn">
                            <input
                              type="text"
                              name="firstname"
                              value={ profile.firstname }
                              onChange={ handleChange }
                              className="settings-text-input"
                              placeholder="First Name"
                              required
                            />
                          </div>
                          <div className="settings-profile-input-subcolumn">
                            <input
                              type="text"
                              name="middlename"
                              value={ profile.middlename }
                              onChange={ handleChange }
                              className="settings-text-input"
                              placeholder="Middle Name"
                            />
                          </div>
                          <div className="settings-profile-input-subcolumn">
                            <input
                              type="text"
                              name="lastname"
                              value={ profile.lastname }
                              onChange={ handleChange }
                              className="settings-text-input"
                              placeholder="Last Name"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="settings-profile-info-text">
                          { profile.firstname } { profile.middlename } { profile.lastname }
                        </p>
                      ) }
                    </div>
                  </div>
                  <div className="settings-profile-separator"></div>
                  <div className="settings-profile-row">
                    <label className="settings-profile-label">Username</label>
                    <div className="settings-profile-input-column">
                      { isEditing ? (
                        <input
                          type="text"
                          name="username"
                          value={ profile.username }
                          onChange={ handleChange }
                          className="settings-text-input"
                          required
                        />
                      ) : (
                        <p className="settings-profile-info-text">
                          <i className="bi bi-at me-1"></i>
                          { profile.username }
                        </p>
                      ) }
                    </div>
                  </div>
                  <div className="settings-profile-separator"></div>
                  <div className="settings-profile-row">
                    <label className="settings-profile-label">Email</label>
                    <div className="settings-profile-input-column">
                      { isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={ profile.email }
                          onChange={ handleChange }
                          className="settings-text-input"
                          required
                        />
                      ) : (
                        <p className="settings-profile-info-text">
                          <i className="bi bi-envelope me-1"></i>
                          { profile.email }
                        </p>
                      ) }
                    </div>
                  </div>
                  <div className="settings-profile-separator"></div>
                  <div className="settings-profile-row">
                    <label className="settings-profile-label">Phone</label>
                    <div className="settings-profile-input-column">
                      { isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={ profile.phone }
                          onChange={ handleChange }
                          className="settings-text-input"
                          placeholder="e.g., +1234567890"
                          required
                        />
                      ) : (
                        <p className="settings-profile-info-text">
                          <i className="bi bi-telephone me-1"></i>
                          { profile.phone || '(097) 234-5678' }
                        </p>
                      ) }
                    </div>
                  </div>
                  <div className="settings-profile-separator"></div>
                  <div className="settings-profile-row">
                    <label className="settings-profile-label">Address</label>
                    <div className="settings-profile-input-column">
                      { isEditing ? (
                        <div className="settings-profile-address">
                          <input
                            type="text"
                            name="address"
                            value={ profile.address }
                            onChange={ handleChange }
                            className="settings-address-input"
                            placeholder="Street Address"
                          />
                          <div className="settings-profile-input-row">
                            <div className="settings-profile-input-subcolumn">
                              <input
                                type="text"
                                name="city"
                                value={ profile.city }
                                onChange={ handleChange }
                                className="settings-text-input"
                                placeholder="City"
                              />
                            </div>
                            <div className="settings-profile-input-subcolumn">
                              <input
                                type="text"
                                name="zipcode"
                                value={ profile.zipcode }
                                onChange={ handleChange }
                                className="settings-text-input"
                                placeholder="ZIP Code"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="settings-profile-info-text">
                          <i className="bi bi-house me-1"></i>
                          { profile.address
                            ? `${profile.address}, ${profile.city}, Philippines ${profile.zipcode}`
                            : 'Bay Area, San Francisco, CA' }
                        </p>
                      ) }
                    </div>
                  </div>
                  { isEditing && (
                    <>
                      <div className="settings-profile-separator"></div>
                      <div className="settings-save-btn-container">
                        <button
                          type="submit"
                          disabled={ isSubmitting }
                          className="settings-save-button"
                        >
                          { isSubmitting ? (
                            <>
                              <span className="settings-save-spinner"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-lg me-2"></i>
                              Save Changes
                            </>
                          ) }
                        </button>
                      </div>
                    </>
                  ) }
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
