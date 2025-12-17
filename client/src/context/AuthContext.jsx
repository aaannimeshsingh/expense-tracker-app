import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// ✅ FIXED: Determine API URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// ✅ FIXED: Remove trailing slash if present
const cleanApiUrl = API_BASE_URL.replace(/\/$/, '');

console.log('🌐 API Base URL:', cleanApiUrl);
console.log('🌐 Environment:', import.meta.env.MODE);

// ✅ FIXED: Create axios instance with proper interceptors
const api = axios.create({
  baseURL: cleanApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// ✅ FIXED: Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
    });
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ FIXED: Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      status: response.status,
      url: response.config.url,
      dataSize: JSON.stringify(response.data).length,
    });
    return response;
  },
  (error) => {
    console.error('📥 API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('💾 Restored user from localStorage:', parsed.email);
        return parsed;
      }
    } catch (err) {
      console.error('❌ Failed to parse stored user:', err);
      localStorage.removeItem('userInfo');
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // --- LOGIN ---
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    console.log('🔐 Login attempt started');
    
    try {
      // ✅ FIXED: Simplified path (no /api prefix duplication)
      const { data } = await api.post('/api/users/login', { 
        email: email.trim(), 
        password 
      });
      
      if (!data.token) {
        throw new Error('No authentication token received from server');
      }
      
      console.log('✅ Login successful:', {
        user: data.name,
        email: data.email,
        hasToken: !!data.token,
      });
      
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      
      // ✅ Set auth header immediately
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('❌ Login failed:', err);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response) {
        // Server responded with error
        errorMessage = err.response.data?.message || 
                      `Server error: ${err.response.status}`;
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        // Something else went wrong
        errorMessage = err.message || 'An unexpected error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER ---
  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);

    console.log('📝 Registration attempt started');

    try {
      const { data } = await api.post('/api/users/register', { 
        name: name.trim(), 
        email: email.trim(), 
        password 
      });
      
      if (!data.token) {
        throw new Error('No authentication token received from server');
      }
      
      console.log('✅ Registration successful:', {
        user: data.name,
        email: data.email,
        hasToken: !!data.token,
      });
      
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      
      // ✅ Set auth header immediately
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('❌ Registration failed:', err);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response) {
        errorMessage = err.response.data?.message || 
                      `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const logout = () => {
    console.log('👋 Logging out user:', user?.email);
    localStorage.removeItem('userInfo');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    navigate('/login', { replace: true });
  };

  // --- UPDATE USER PROFILE ---
  const updateUserProfile = (updatedUser) => {
    console.log('🔄 Updating user profile');
    
    const updatedUserData = {
      ...user,
      ...updatedUser,
      token: user.token, // Preserve token
    };
    
    setUser(updatedUserData);
    localStorage.setItem('userInfo', JSON.stringify(updatedUserData));
    
    console.log('✅ Profile updated');
  };

  // ✅ Set auth header when component mounts or user changes
  useEffect(() => {
    if (user?.token) {
      console.log('🔑 Setting auth header for:', user.email);
      api.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    } else {
      console.log('🔓 Clearing auth header (no user)');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [user]);

  // ✅ FIXED: Add network connectivity check
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${cleanApiUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(5000) 
        });
        if (response.ok) {
          console.log('✅ Backend connection: OK');
        } else {
          console.warn('⚠️ Backend responded but not OK:', response.status);
        }
      } catch (err) {
        console.error('❌ Backend connection failed:', err.message);
        console.log('💡 Make sure backend is running on:', cleanApiUrl);
      }
    };
    
    checkConnection();
  }, []);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        login, 
        register, 
        logout, 
        updateUserProfile,
        loading, 
        error, 
        setError,
        api, // Export api instance for use in components
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ✅ Export the api instance for use in other files
export { api };