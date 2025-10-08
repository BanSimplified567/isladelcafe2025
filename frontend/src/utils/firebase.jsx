import { initializeApp } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAfVpRsg3IvO8ZIFO6JueX5hUpxCFuzXA",
  authDomain: "isladelcafe-80a7d.firebaseapp.com",
  projectId: "isladelcafe-80a7d",
  storageBucket: "isladelcafe-80a7d.firebasestorage.app",
  messagingSenderId: "752309987767",
  appId: "1:752309987767:web:bc295fa9125291d7f1e032"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Base API URL
const API_BASE = "http://localhost:8000/backend/public/index.php";

// Helper function to call PHP backend (protected route)
async function callProtectedAPI(idToken, action = "check-auth", options = {}) {
  try {
    const response = await fetch(`${API_BASE}?action=${action}`, {
      method: options.method || "GET",
      headers: {
        ...(idToken ? { "Authorization": `Bearer ${idToken}` } : {}),
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: 'include', // Support session cookies
      body: options.body ? JSON.stringify(options.body) : null,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API error (${response.status}):`, data.message || 'Unknown error');
      return { success: false, message: data.message || 'API request failed', status: response.status };
    }

    console.log("✅ Backend response:", data);
    return data;
  } catch (error) {
    console.error("❌ Network/API request error:", error.message);
    return { success: false, message: error.message, status: null };
  }
}

// Email/Password Login
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const result = await callProtectedAPI(idToken, "check-auth");
    return {
      success: result.success,
      user: result.user || { uid: userCredential.user.uid, email: userCredential.user.email },
      token: idToken,
      message: result.message
    };
  } catch (error) {
    console.error("❌ Email sign-in error:", error.message);
    return { success: false, message: error.message };
  }
}

// Google Login
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);

    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      const response = await callProtectedAPI(idToken, "check-auth");
      return {
        success: response.success,
        user: response.user || {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        },
        token: idToken,
        message: response.message
      };
    }
    return { success: false, message: 'No redirect result received' };
  } catch (error) {
    console.error("❌ Google sign-in error:", error.message);
    return { success: false, message: error.message };
  }
}

// Google Sign-Up
export async function registerWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);

    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      const userData = {
        firebase_uid: result.user.uid,
        email: result.user.email,
        fullname: result.user.displayName || 'Unknown User',
        photo_url: result.user.photoURL,
        role: 'customer'
      };
      const response = await callProtectedAPI(idToken, "register", {
        method: 'POST',
        body: userData
      });
      return {
        success: response.success,
        user: response.user || userData,
        token: idToken,
        message: response.message
      };
    }
    return { success: false, message: 'No redirect result received' };
  } catch (error) {
    console.error("❌ Google sign-up error:", error.message);
    return { success: false, message: error.message };
  }
}

// Logout user
export async function logoutUser() {
  try {
    await signOut(auth);
    await fetch(`${API_BASE}?action=logout`, { method: 'GET', credentials: 'include' });
    console.log("👋 User signed out successfully");
    return { success: true, message: 'Signed out' };
  } catch (error) {
    console.error("❌ Sign-out error:", error.message);
    return { success: false, message: error.message };
  }
}

export { auth, callProtectedAPI };
