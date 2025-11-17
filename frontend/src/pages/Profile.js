import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { FaUser, FaCamera } from 'react-icons/fa';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form
  const [username, setUsername] = useState('');
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile picture
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setPreview(user.profilePictureUrl || null);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.updateProfile({ username });
      setUser(response.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error updating profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      await authAPI.updatePassword({ currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error updating password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }

      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSrc(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onImageLoaded = (image) => {
    if (!image) return;
    imgRef.current = image;
    
    // Use displayed image dimensions (not natural dimensions for initial crop)
    const displayedWidth = image.width;
    const displayedHeight = image.height;
    const minDimension = Math.min(displayedWidth, displayedHeight);
    
    // Set crop to 90% of smallest dimension, centered
    const cropSize = minDimension * 0.9;
    const x = (displayedWidth - cropSize) / 2;
    const y = (displayedHeight - cropSize) / 2;
    
    setCrop({
      unit: 'px',
      x,
      y,
      width: cropSize,
      height: cropSize,
      aspect: 1
    });
  };

  const getCroppedImg = (image, crop) => {
    if (!image || !crop.width || !crop.height) {
      return Promise.resolve(null);
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    // Calculate crop coordinates in natural image dimensions
    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    // Draw cropped image to canvas, resizing to 256x256
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      256,
      256
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.92
      );
    });
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    try {
      const croppedImageBase64 = await getCroppedImg(imgRef.current, completedCrop);
      if (croppedImageBase64) {
        setPreview(croppedImageBase64);
        setShowCropModal(false);
        setSrc(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error cropping image' });
    }
  };

  const handleCancelCrop = () => {
    setShowCropModal(false);
    setSrc(null);
    setProfilePicture(null);
    setCrop({ unit: '%', width: 90, aspect: 1 });
    setCompletedCrop(null);
  };

  const handleProfilePictureUpdate = async () => {
    if (!preview) {
      setMessage({ type: 'error', text: 'Please crop and confirm your image first' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.updateProfilePicture({ profilePictureUrl: preview });
      setUser(response.data);
      setProfilePicture(null);
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Error updating profile picture' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.updateProfilePicture({ profilePictureUrl: null });
      setUser(response.data);
      setPreview(null);
      setProfilePicture(null);
      setMessage({ type: 'success', text: 'Profile picture removed successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing profile picture' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
        {/* Profile Picture Section */}
        <div className="profile-section">
          <h2>Profile Picture</h2>
          <div className="profile-picture-section">
            <div className="profile-picture-container">
              {preview ? (
                <img src={preview} alt="Profile" className="profile-picture-large" />
              ) : (
                <div className="profile-picture-placeholder">
                  <FaUser className="placeholder-icon" />
                </div>
              )}
              <label className="upload-button">
                <FaCamera className="camera-icon" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div className="picture-actions">
              {preview && (
                <>
                  <button 
                    onClick={handleProfilePictureUpdate}
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Uploading...' : 'Upload Picture'}
                  </button>
                  <button 
                    onClick={handleRemovePicture}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    Remove Picture
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Crop Modal */}
          {showCropModal && src && (
            <div className="crop-modal-overlay" onClick={handleCancelCrop}>
              <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Crop Your Profile Picture (1:1)</h3>
                <div className="crop-container">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    minWidth={50}
                  >
                    <img
                      ref={imgRef}
                      src={src}
                      alt="Crop"
                      onLoad={(e) => {
                        if (e.target) {
                          onImageLoaded(e.target);
                        }
                      }}
                      style={{ maxWidth: '100%', maxHeight: '500px', display: 'block' }}
                    />
                  </ReactCrop>
                </div>
                <div className="crop-actions">
                  <button onClick={handleCancelCrop} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleCropComplete} className="btn btn-primary">
                    Confirm Crop
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Information Section */}
        <div className="profile-section">
          <h2>Profile Information</h2>
          <form onSubmit={handleProfileUpdate} className="profile-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className="form-input"
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="profile-section">
          <h2>Change Password</h2>
          <form onSubmit={handlePasswordUpdate} className="profile-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="form-input"
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

