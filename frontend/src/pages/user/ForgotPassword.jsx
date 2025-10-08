import '@style/Register.css';
import axios from 'axios';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    security_questions: Array(5).fill().map((_, index) => ({
      question_id: index + 1,
      question: '',
      answer: '',
    })),
  });
  const [showAnswers, setShowAnswers] = useState(Array(5).fill(false));
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetChoice, setResetChoice] = useState(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const firstInputRef = useRef(null); // For focusing first input on step change

  useEffect(() => {
    const fetchSecurityQuestions = async () => {
      try {
        const response = await axios.get('/api/core.php?action=get_questions');
        if (response.data && Array.isArray(response.data)) {
          setFormData((prev) => ({
            ...prev,
            security_questions: prev.security_questions.map((q, index) => ({
              ...q,
              question: response.data.find((sq) => sq.security_id === index + 1)?.question || '',
            })),
          }));
        } else {
          setLocalError('No security questions available');
        }
      } catch (error) {
        console.error('Error fetching security questions:', error);
        setLocalError('Failed to load security questions');
      }
    };
    fetchSecurityQuestions();
  }, []);

  useEffect(() => {
    // Focus first input when step changes
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [step]);

  const handleAnswerChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      security_questions: prev.security_questions.map((q, i) =>
        i === index ? { ...q, answer: value } : q
      ),
    }));
    setLocalError(null);
  };

  const toggleShowAnswer = (index) => {
    setShowAnswers((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const validateStep1 = () => {
    if (formData.security_questions.some((q) => !q.answer.trim())) {
      return 'All security question answers are required.';
    }
    return null;
  };

  const validateStep2 = () => {
    if (resetChoice === 'username') {
      if (!newUsername.trim()) return 'New username is required';
      if (newUsername.length < 3) return 'Username must be at least 3 characters long';
    } else if (resetChoice === 'password') {
      if (!newPassword.trim()) return 'New password is required';
      if (!validatePassword(newPassword)) {
        return 'Password must be at least 8 characters long with uppercase, lowercase, and numbers';
      }
      if (newPassword !== confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const validatePassword = (password) =>
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    const error = validateStep1();
    if (error) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: error,
        confirmButtonColor: '#A67B60',
      });
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      const answers = formData.security_questions.reduce((acc, q, i) => ({
        ...acc,
        [`answer_${i + 1}`]: q.answer,
      }), {});

      const response = await axios.post('/api/core.php', {
        action: 'verify_security_answers_only',
        ...answers,
      });

      if (response.data.success) {
        setUserInfo(response.data.user);
        setStep(2);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Verification Failed',
          text: response.data.message || 'Security answers do not match',
          confirmButtonColor: '#A67B60',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.status === 404
          ? 'No user found with these security answers. Please check your answers and try again.'
          : 'Server error. Please try again.',
        confirmButtonColor: '#A67B60',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    const error = validateStep2();
    if (error) {
      setLocalError(error);
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: error,
        confirmButtonColor: '#A67B60',
      });
      return;
    }
    setLocalError(null);
    setLoading(true);
    try {
      const answers = formData.security_questions.reduce((acc, q, i) => ({
        ...acc,
        [`answer_${i + 1}`]: q.answer,
      }), {});

      const response = await axios.post('/api/core.php', {
        action: resetChoice === 'username' ? 'reset_username_by_answers' : 'reset_password_by_answers',
        new_username: newUsername,
        new_password: newPassword,
        ...answers,
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Reset Successful',
          html: resetChoice === 'username'
            ? `Your username has been updated to: <strong>${response.data.new_username}</strong><br>Email: <strong>${response.data.email}</strong>`
            : `Your password has been updated successfully!<br>Username: <strong>${response.data.username}</strong><br>Email: <strong>${response.data.email}</strong>`,
          confirmButtonColor: '#A67B60',
          timer: 3000,
          showConfirmButton: true,
        }).then(() => {
          setStep(1);
          setResetChoice(null);
          setUserInfo(null);
          navigate('/');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: response.data.message || 'Reset failed. Please try again.',
          confirmButtonColor: '#A67B60',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.status === 404
          ? 'No user found with these security answers. Please check your answers and try again.'
          : 'Server error. Please try again.',
        confirmButtonColor: '#A67B60',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetChoice = (choice) => {
    setResetChoice(choice);
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setLocalError(null);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="step-indicator">
          <button
            className={`step ${step === 1 ? 'active' : ''}`}
            onClick={() => setStep(1)}
            disabled={step === 1}
            aria-current={step === 1 ? 'step' : undefined}
          >
            Step 1: Verify Identity
          </button>
          <button
            className={`step ${step === 2 ? 'active' : ''}`}
            onClick={() => {
              if (validateStep1() === null) setStep(2);
            }}
            disabled={step === 2 || validateStep1() !== null}
            aria-current={step === 2 ? 'step' : undefined}
          >
            Step 2: Reset Credentials
          </button>
        </div>
        <div className="register-container-information-user">
          {step === 1 ? (
            <div className="register-content">
              <div className="register-left">
                <div className="register-header">
                  <Lock className="register-logo" aria-hidden="true" />
                  <h1 className="register-title">Forgot Password</h1>
                  <p className="register-subtitle">Reset your account credentials securely</p>
                </div>
              </div>
              <div className="register-right">
                <form onSubmit={handleStep1Submit} className="register-form" noValidate>
                  <div className="security-questions">
                    <h3 className="security-title">Verify Your Identity</h3>
                    {formData.security_questions.map((question, index) => (
                      <div key={index} className="security-question-group">
                        <div className="register-row">
                          <div className="register-col">
                            <div className="form-outline">
                              <label
                                className="form-labelquestions"
                                htmlFor={`security_answer_${index}`}
                              >
                                Question {index + 1}
                              </label>
                              <p className="form-control-plaintext">{question.question}</p>
                            </div>
                          </div>
                          <div className="register-col">
                            <div className="form-outline">
                              <div className="input-wrapper">
                                <Lock className="input-icon" aria-hidden="true" />
                                <input
                                  id={`security_answer_${index}`}
                                  type={showAnswers[index] ? 'text' : 'password'}
                                  className="form-control"
                                  placeholder="Enter your answer..."
                                  value={question.answer}
                                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                                  aria-label={`Answer for security question ${index + 1}`}
                                  ref={index === 0 ? firstInputRef : null}
                                  required
                                />
                                <label
                                  className="form-label"
                                  htmlFor={`security_answer_${index}`}
                                >
                                  Answer
                                </label>
                                <button
                                  type="button"
                                  className="password-toggle"
                                  onClick={() => toggleShowAnswer(index)}
                                  aria-label={showAnswers[index] ? 'Hide answer' : 'Show answer'}
                                >
                                  {showAnswers[index] ? (
                                    <EyeOff className="toggle-icon" aria-hidden="true" />
                                  ) : (
                                    <Eye className="toggle-icon" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {localError && (
                    <div id="error-message" className="error-message" role="alert">
                      {localError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={loading}
                    aria-label="Verify Answers"
                  >
                    {loading ? (
                      <svg className="spinner" viewBox="0 0 24 24" aria-label="Loading">
                        <circle
                          className="spinner-circle"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="spinner-path"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      'Verify Answers'
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="register-content">
              <div className="register-right register-right-full">
                <div className="register-header">
                  <Lock className="register-logo" aria-hidden="true" />
                  <h2 className="register-title">Reset Credentials</h2>
                  <p className="register-subtitle">Choose what to reset</p>
                </div>
                {userInfo && (
                  <div className="selected-questions-review">
                    <h3>Verified User Information</h3>
                    <ol>
                      <li><strong>Full Name:</strong> {userInfo.fullname}</li>
                      <li><strong>Email:</strong> {userInfo.email}</li>
                      <li><strong>Current Username:</strong> {userInfo.username}</li>
                    </ol>
                  </div>
                )}
                <form onSubmit={handleStep2Submit} className="register-form" noValidate>
                  {!resetChoice ? (
                    <div className="register-row">
                      <p className="register-subtitle">What would you like to reset?</p>
                      <div className="button-group">
                        <button
                          type="button"
                          onClick={() => handleResetChoice('username')}
                          className="submit-button"
                          aria-label="Reset Username"
                        >
                          Reset Username
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetChoice('password')}
                          className="submit-button"
                          aria-label="Reset Password"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {resetChoice === 'username' && (
                        <div className="form-outline">
                          <div className="input-wrapper">
                            <Lock className="input-icon" aria-hidden="true" />
                            <input
                              id="new_username"
                              name="new_username"
                              placeholder="Enter new username..."
                              type="text"
                              className="form-control"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              aria-label="New Username"
                              ref={firstInputRef}
                              required
                            />
                            <label className="form-label" htmlFor="new_username">
                              New Username
                            </label>
                          </div>
                        </div>
                      )}
                      {resetChoice === 'password' && (
                        <>
                          <div className="form-outline">
                            <div className="input-wrapper">
                              <Lock className="input-icon" aria-hidden="true" />
                              <input
                                id="new_password"
                                name="new_password"
                                placeholder="Enter new password..."
                                type={showNewPassword ? 'text' : 'password'}
                                className="form-control"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                aria-label="New Password"
                                ref={firstInputRef}
                                required
                              />
                              <label className="form-label" htmlFor="new_password">
                                New Password
                              </label>
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="toggle-icon" aria-hidden="true" />
                                ) : (
                                  <Eye className="toggle-icon" aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="form-outline">
                            <div className="input-wrapper">
                              <Lock className="input-icon" aria-hidden="true" />
                              <input
                                id="confirm_password"
                                name="confirm_password"
                                placeholder="Confirm new password..."
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                aria-label="Confirm Password"
                                required
                              />
                              <label className="form-label" htmlFor="confirm_password">
                                Confirm Password
                              </label>
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="toggle-icon" aria-hidden="true" />
                                ) : (
                                  <Eye className="toggle-icon" aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      {localError && (
                        <div id="error-message" className="error-message" role="alert">
                          {localError}
                        </div>
                      )}
                      <div className="button-group">
                        <button
                          type="button"
                          onClick={() => {
                            setStep(1);
                            setResetChoice(null);
                            setNewUsername('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setUserInfo(null);
                          }}
                          className="back-button"
                          aria-label="Go back to security questions"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className={`submit-button ${loading ? 'disabled' : ''}`}
                          disabled={loading}
                          aria-label={`Reset ${resetChoice === 'username' ? 'Username' : 'Password'}`}
                        >
                          {loading ? (
                            <svg className="spinner" viewBox="0 0 24 24" aria-label="Loading">
                              <circle
                                className="spinner-circle"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="spinner-path"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          ) : (
                            `Reset ${resetChoice === 'username' ? 'Username' : 'Password'}`
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
        <div className="register-footer">
          <NavLink to="/" className="register-link" aria-label="Back to Login">
            Back to Login
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
