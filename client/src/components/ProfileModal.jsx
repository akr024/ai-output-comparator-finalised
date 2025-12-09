import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const ProfileModal = ({ onClose, onLogout }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    location: '',
    bio: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false); // <-- separate state for delete
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data.profile);
      setLoading(false);
    } catch (err) {
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          location: profile.location || '',
          bio: profile.bio || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccess('Profile updated successfully!');
      setSaving(false);

      setTimeout(() => onClose(), 500);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    setError('');
    setDeleting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      // Log out globally
      localStorage.removeItem('token');
      if (onLogout) onLogout();   // <-- clears user state globally

      onClose();                 // close modal
      navigate('/');              // redirect home
    } catch (err) {
      setError(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>👤 User Profile</h2>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            {error && <div className="message-error">{error}</div>}
            {success && <div className="message-success">{success}</div>}

            <div className="profile-section">
              <h3>Account Information</h3>

              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} disabled className="disabled-input" />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input type="text" value={profile.username} disabled className="disabled-input" />
              </div>
            </div>

            <div className="profile-section">
              <h3>Personal Information</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    disabled={saving || deleting}
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    disabled={saving || deleting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={saving || deleting}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  disabled={saving || deleting}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows="4"
                  disabled={saving || deleting}
                />
              </div>
            </div>

            <button type="submit" className="profile-save-btn" disabled={saving || deleting}>
              {saving ? '💾 Saving...' : '💾 Save Changes'}
            </button>

            <button
              type="button"
              className="profile-delete-btn"
              onClick={handleDelete}
              disabled={saving || deleting}
              style={{ marginTop: '10px', backgroundColor: '#e74c3c', color: '#fff' }}
            >
              {deleting ? '🗑️ Deleting...' : '🗑️ Delete Account'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ProfileModal;
