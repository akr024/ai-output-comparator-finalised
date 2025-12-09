import { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function Login({ onSuccess }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.tokens.access);
      localStorage.setItem('user', JSON.stringify(data.user));

      onSuccess(data);
      navigate('/');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
  <div className="auth-wrapper">
    <div className="auth-card">
      <button onClick={() => navigate('/')} className="back-btn">← Back</button>

      <div className="auth-header">
        <h2>Welcome Back!</h2>
        <p>Sign in to continue</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="auth-submit">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  </div>
);

}
