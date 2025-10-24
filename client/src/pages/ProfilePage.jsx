import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { User, Mail, Edit, Camera, Save, X, RotateCw } from 'lucide-react';

const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    profilePicture: user?.profilePicture || 'https://placehold.co/100x100/A5B4FC/ffffff?text=U'
  });
  
  const [imagePreview, setImagePreview] = useState(null);

  if (!user) {
    return (
      <div className="text-center p-8 text-gray-500">
        Please log in to view your profile.
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setFormData({ ...formData, profilePicture: base64String });
      setImagePreview(base64String);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setError('');
    if (isEditing) {
      setFormData({
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture
      });
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.put('https://expense-tracker-app-nsco.onrender.com/api/users/profile', {
        name: formData.name,
        profilePicture: formData.profilePicture
      }, config);
      
      // Update context with new data including token
      updateUserProfile({
        ...data,
        token: user.token
      });

      setIsEditing(false);
      setImagePreview(null);
      alert('Profile updated successfully!');

    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-2">
          <User className="w-7 h-7 text-indigo-600" />
          <span>User Profile</span>
        </h1>
        <button
          onClick={handleEditToggle}
          className={`flex items-center px-4 py-2 text-sm rounded-lg transition ${
            isEditing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
          disabled={loading}
        >
          {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col items-center space-y-6">
          
          {/* Profile Picture Section */}
          <div className="relative group">
            <img
              src={imagePreview || formData.profilePicture}
              alt="Profile"
              className="w-32 h-32 rounded-full object-cover border-4 border-indigo-200 transition-all duration-300 group-hover:border-indigo-400"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/100x100/A5B4FC/ffffff?text=U';
              }}
            />
            {isEditing && (
              <label htmlFor="profileImage" className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
                <input
                  type="file"
                  id="profileImage"
                  name="profileImage"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          
          {/* Form Fields */}
          <div className="w-full space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-600 flex items-center mb-1">
                <User className="w-4 h-4 mr-2" /> Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                disabled={!isEditing || loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                required
                // FIX: Changed 'autocomplete' to 'autoComplete' for JSX
                autoComplete="name" 
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-600 flex items-center mb-1">
                <Mail className="w-4 h-4 mr-2" /> Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                disabled={true}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100 text-gray-500 cursor-not-allowed"
                // FIX: Changed 'autocomplete' to 'autoComplete' for JSX
                autoComplete="email" 
              />
              <p className="text-xs text-gray-500 mt-1">Email address is read-only.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {isEditing && (
          <button
            type="submit"
            className="mt-6 w-full py-3 px-4 flex items-center justify-center bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400"
            disabled={loading}
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        )}
      </form>
    </div>
  );
};

export default ProfilePage;