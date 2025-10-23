import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { user } = useAuth();
  
  // Renders the child route if the user object exists in context (logged in).
  // Otherwise, sends them to the login route.
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
