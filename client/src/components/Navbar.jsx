import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout, api } = useAuth(); // ✅ Get api instance from AuthContext
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const fetchNotifications = async () => {
      // Only proceed if user exists and has a token
      if (!user?.token) {
        console.log('⏭️ Skipping notifications: No user token');
        setNotifications([]);
        return;
      }
      
      setIsLoadingNotifications(true);
      console.log('📬 Fetching notifications...');
      
      try {
        // ✅ Use the api instance from AuthContext (already has auth headers)
        const res = await api.get('/api/notifications');
        
        console.log('✅ Notifications fetched:', res.data.length);
        setNotifications(res.data); 
      } catch (err) {
        console.error('❌ Failed to fetch notifications:', err);
        
        // Handle 401 specifically - token is invalid or expired
        if (err.response?.status === 401) {
          console.warn('🔒 Authentication failed. Token may be expired.');
          setNotifications([]);
          // Optionally: Auto logout and redirect to login
          // logout();
        } else {
          // For other errors, just clear notifications
          setNotifications([]);
        }
      } finally {
        setIsLoadingNotifications(false);
      }
    };
    
    // Only fetch if user and token exist
    if (user?.token) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user?.token, api]); // Include api in dependencies

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200 shadow-md relative">
      <div className="hidden md:block">
        <p className="text-xl font-semibold text-gray-700">Financial Dashboard</p>
        <p className="text-sm text-gray-500">{date}</p>
      </div>

      <div className="md:hidden">
        <p className="text-xl font-semibold text-gray-700">Tracker AI</p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Button */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="p-2 text-gray-500 hover:text-indigo-600 relative rounded-full hover:bg-gray-100 transition duration-150"
            aria-label="Toggle notifications"
            name="notifications-toggle"
            disabled={!user?.token}
          >
            <Bell className="w-6 h-6" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
              <div className="p-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Notifications</p>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {isLoadingNotifications ? (
                  <li className="p-3 text-sm text-gray-500 text-center">Loading...</li>
                ) : !user?.token ? (
                  <li className="p-3 text-sm text-gray-500 text-center">Please log in to view notifications</li>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => (
                    <li
                      key={n.id}
                      className="p-3 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                      role="button"
                    >
                      {n.message}
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-sm text-gray-500 text-center">No new notifications</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* User Profile Info */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition duration-150"
            role="button"
            aria-label="Toggle user profile menu"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.name || 'Guest User'}
              </p>
              <p className="text-xs text-gray-500">Financial Analyst</p>
            </div>
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="h-10 w-10 rounded-full object-cover border-2 border-indigo-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/100x100/A5B4FC/ffffff?text=U';
                }}
              />
            ) : (
              <div className="bg-indigo-500 rounded-full h-10 w-10 flex items-center justify-center text-white">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
              <ul className="py-2 text-sm text-gray-700">
                <li
                  className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    navigate('/profile');
                    setShowProfileMenu(false);
                  }}
                  role="button"
                >
                  <UserCircle className="w-4 h-4 mr-2 text-indigo-500" /> View Profile
                </li>
                <li
                  className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-red-500"
                  onClick={logout}
                  role="button"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;