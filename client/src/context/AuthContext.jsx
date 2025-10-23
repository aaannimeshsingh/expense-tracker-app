import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// ✅ Set Axios defaults
axios.defaults.baseURL = 'http://localhost:5001';
axios.defaults.headers.post['Content-Type'] = 'application/json';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('userInfo')) || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_URL = '/api/users';

  // --- LOGIN ---
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API_URL}/login`, { email, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Login failed.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTER ---
  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);

    console.log('Attempting registration with:', { name, email, password: '***' });

    try {
      const { data } = await axios.post(`${API_URL}/register`, { name, email, password });
      console.log('Registration response:', data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      navigate('/');
    } catch (err) {
      console.error('Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });

      let errorMessage = 'Registration failed.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Make sure the backend is running on port 5000.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGOUT ---
  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    axios.defaults.headers.common['Authorization'] = '';
    navigate('/login');
  };

  // 🆕 --- UPDATE USER PROFILE ---
  const updateUserProfile = (updatedUser) => {
    // Merge updated data with existing user data (preserve token)
    const updatedUserData = {
      ...user,
      ...updatedUser,
      token: user.token // Ensure token is preserved
    };
    
    setUser(updatedUserData);
    localStorage.setItem('userInfo', JSON.stringify(updatedUserData));
  };

  // --- Set token header automatically ---
  useEffect(() => {
    if (user && user.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        login, 
        register, 
        logout, 
        updateUserProfile, // 🆕 NEW FUNCTION
        loading, 
        error, 
        setError 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);