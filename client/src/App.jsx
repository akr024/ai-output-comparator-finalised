import { useState, useEffect } from 'react';
import './App.css';

// AI Models Configuration
const AI_MODELS = [
  { name: 'Groq', badge: 'Llama 3.3 70B', icon: '⚡', color: 'groq', key: 'groq' },
  { name: 'Gemini', badge: 'Google', icon: '✨', color: 'gemini', key: 'gemini' }
];

function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState({});
  const [compareMode, setCompareMode] = useState('both'); // 'both', 'groq', or 'gemini'
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup', same below
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [systemPrompt, setSystemPrompt] = useState('');
  const [rubricEvaluation, setRubricEvaluation] = useState(null);
  const [showRubric, setShowRubric] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert('Please enter a question');

    setLoading(true);
    setResponses({});

    try {
      let endpoint;
      switch (compareMode) {
        case 'groq':
          endpoint = 'http://localhost:3001/api/ai/groq';
          break;
        case 'gemini':
          endpoint = 'http://localhost:3001/api/ai/gemini';
          break;
        case 'both':
        default:
          endpoint = 'http://localhost:3001/api/ai/compare';
          break;
      }

      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt 
        })
      });

      if (!response.ok) throw new Error('Failed to get responses');
      
      const responseData = await response.json();

      if (compareMode === 'groq') {
        setResponses({ groq: responseData });
      } else if (compareMode === 'gemini') {
        setResponses({ gemini: responseData });
      } else {
        setResponses(responseData);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get AI responses. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/users/queries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      alert('Failed to fetch history');
    }
  };

  const handleShowHistory = () => {
    fetchHistory();
    setShowHistoryModal(true);
  };

  const handleClear = () => {
    setPrompt('');
    setResponses({});
    setRubricEvaluation(null);
    setShowRubric(false);
  };

  const handleCompareWithRubric = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert('Please enter a question');

    setLoading(true);
    setResponses({});
    setRubricEvaluation(null);
    setShowRubric(false);

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:3001/api/ai/compare-with-rubric', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt 
        })
      });

      if (!response.ok) throw new Error('Failed to get responses');
      
      const data = await response.json();

      // Set responses
      setResponses({
        groq: data.responses.groq,
        gemini: data.responses.gemini
      });

      // Set rubric evaluation
      if (data.evaluation && data.evaluation.success) {
        setRubricEvaluation(data.evaluation);
        setShowRubric(true);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get AI responses with rubric. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-text">
            {user && (
              <button onClick={handleShowHistory} className="auth-btn history-btn-left">
                📜 History
              </button>
            )}
            <div className="header-title">
              <h1> United Chats of America 🇺🇸 </h1>
              <p>Compare responses from different AI models</p>
            </div>
          </div>
          <div className="header-auth">
            <button onClick={toggleDarkMode} className="auth-btn theme-btn" title="Toggle theme">
              {darkMode ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className="user-menu">
                <span className="user-name">👤 {user.username}</span>
                <button onClick={() => setShowProfileModal(true)} className="auth-btn profile-btn">
                  Profile
                </button>
                <button onClick={handleLogout} className="auth-btn logout-btn">
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => openAuthModal('login')} className="auth-btn login-btn">
                  Sign In
                </button>
                <button onClick={() => openAuthModal('signup')} className="auth-btn signup-btn">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <form onSubmit={handleSubmit} className="input-section">
          {/* System Prompt */}
          <div className="system-prompt-section">
            <label className="system-prompt-label">
              🤖 System Prompt (Optional)
              <span className="system-prompt-hint">Set custom instructions for the AI</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g., 'You are a helpful coding assistant' or 'Explain like I'm 5'"
              rows="2"
              disabled={loading}
              className="system-prompt-input"
            />
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your question here"
            rows="4"
            disabled={loading}
            className="prompt-input"
          />
          
          {/* Compare Mode Selector */}
          <div className="mode-selector">
            <label className="mode-label">Select AI model:</label>
            <div className="mode-options">
              <button
                type="button"
                className={`mode-btn ${compareMode === 'both' ? 'active' : ''}`}
                onClick={() => setCompareMode('both')}
                disabled={loading}
              >
                🔄 Groq and Gemini
              </button>
              <button
                type="button"
                className={`mode-btn ${compareMode === 'groq' ? 'active' : ''}`}
                onClick={() => setCompareMode('groq')}
                disabled={loading}
              >
                ⚡ Only Groq
              </button>
              <button
                type="button"
                className={`mode-btn ${compareMode === 'gemini' ? 'active' : ''}`}
                onClick={() => setCompareMode('gemini')}
                disabled={loading}
              >
                ✨ Only Gemini
              </button>
            </div>
          </div>

          <div className="button-group">
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '🔄 Loading...' : '✨ Get AI Response'}
            </button>
            <button 
              type="button" 
              onClick={handleCompareWithRubric} 
              disabled={loading || compareMode !== 'both'} 
              className="rubric-btn"
              title={compareMode !== 'both' ? 'Rubric comparison only works in "Both" mode' : 'Compare with AI-powered evaluation'}
            >
              {loading ? '🔄 Loading...' : '📊 Compare with Rubric'}
            </button>
            <button type="button" onClick={handleClear} disabled={loading} className="clear-btn">
              🗑️ Clear
            </button>
          </div>
        </form>

        <div className="responses-section">
          {AI_MODELS
            .filter(model => compareMode === 'both' || model.key === compareMode)
            .map(model => (
              <ResponseCard
                key={model.key}
                {...model}
                data={responses[model.key]}
                loading={loading}
              />
            ))}
        </div>

        {/* Rubric Evaluation Section */}
        {showRubric && rubricEvaluation && (
          <RubricEvaluation evaluation={rubricEvaluation} />
        )}
      </div>

      <footer className="footer">
        <p>CS5610 - Final Project</p>
      </footer>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(userData) => {
            setUser(userData.user);
            localStorage.setItem('token', userData.tokens.access);
            localStorage.setItem('user', JSON.stringify(userData.user));
            setShowAuthModal(false);
          }}
        />
      )}

      {showHistoryModal && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistoryModal(false)}
          onSelectQuery={(query) => {
            // Set the prompt and mode
            setPrompt(query.prompt);
            setCompareMode(query.mode);
            
            // Display the responses in the main cards
            const responsesToShow = {};
            if (query.responses.groq) {
              responsesToShow.groq = {
                model: 'Groq',
                response: query.responses.groq,
                timestamp: query.created_at
              };
            }
            if (query.responses.gemini) {
              responsesToShow.gemini = {
                model: 'Gemini',
                response: query.responses.gemini,
                timestamp: query.created_at
              };
            }
            setResponses(responsesToShow);
            
            setShowHistoryModal(false);
          }}
        />
      )}

      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

export default App;




const ResponseCard = ({ name, badge, icon, color, data, loading }) => (
  <div className="response-card">
    <div className={`card-header ${color}-header`}>
      <h2>{icon} {name}</h2>
      <span className="badge">{badge}</span>
    </div>
    <div className="card-body">
      {loading && !data && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Getting response from {name}...</p>
        </div>
      )}
      {data && (
        <div className="response-content">
          {data.error ? (
            <div className="error-message">
              <p>⚠️ {data.response}</p>
              <small>{data.error}</small>
            </div>
          ) : (
            <>
              <p>{data.response}</p>
              {data.timestamp && (
                <div className="timestamp">
                  {new Date(data.timestamp).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {!loading && !data && (
        <div className="empty-state">
          <p>No response yet. Enter a question and click "Compare AI Responses"</p>
        </div>
      )}
    </div>
  </div>
);

// Auth Modal Component
const AuthModal = ({ mode, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' 
        ? 'http://localhost:3001/api/auth/login'
        : 'http://localhost:3001/api/auth/register';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      onSuccess(data);
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{mode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="message-error">{error}</div>}
          
          {mode === 'signup' && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button 
            className="auth-switch-btn" 
            onClick={() => {
              setError('');
              setFormData({ username: '', email: '', password: '' });
              onClose();
              setTimeout(() => {
                document.querySelector(mode === 'login' ? '.signup-btn' : '.login-btn')?.click();
              }, 100);
            }}
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

// Profile Modal Component
const ProfileModal = ({ onClose }) => {
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
  //to prevent double submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile(data.profile);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      const response = await fetch('http://localhost:3001/api/users/profile', {
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
      
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
      setSaving(false);
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
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="disabled-input"
                />
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
                    placeholder="Enter your first name"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Enter your last name"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="City, Country"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows="4"
                  disabled={saving}
                />
              </div>
            </div>

            <button type="submit" className="profile-save-btn" disabled={saving}>
              {saving ? '💾 Saving...' : '💾 Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Rubric Evaluation Component
const RubricEvaluation = ({ evaluation }) => {
  if (!evaluation || !evaluation.rubric) return null;

  const { rubric, evaluator } = evaluation;
  const { response_a, response_b, overall_comparison, recommendation } = rubric;

  return (
    <div className="rubric-section">
      <div className="rubric-header">
        <h2>📊 AI Evaluation Results</h2>
        <span className="evaluator-badge">Evaluated by: {evaluator}</span>
      </div>

      <div className="rubric-content">
        <div className="rubric-scores">
          {/* Response A (Groq) */}
          <div className="rubric-card groq-rubric">
            <h3>⚡ Groq (Llama 3.3)</h3>
            <div className="total-score">
              Total Score: <span className="score-value">{response_a.total}/50</span>
            </div>
            
            <div className="criteria-scores">
              <div className="criteria-item">
                <span className="criteria-name">Accuracy</span>
                <span className="criteria-score">{response_a.accuracy}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Relevance</span>
                <span className="criteria-score">{response_a.relevance}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Clarity</span>
                <span className="criteria-score">{response_a.clarity}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Completeness</span>
                <span className="criteria-score">{response_a.completeness}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Usefulness</span>
                <span className="criteria-score">{response_a.usefulness}/10</span>
              </div>
            </div>

            <div className="strengths-weaknesses">
              <div className="strengths">
                <h4>✅ Strengths</h4>
                <ul>
                  {response_a.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="weaknesses">
                <h4>⚠️ Weaknesses</h4>
                <ul>
                  {response_a.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Response B (Gemini) */}
          <div className="rubric-card gemini-rubric">
            <h3>✨ Gemini</h3>
            <div className="total-score">
              Total Score: <span className="score-value">{response_b.total}/50</span>
            </div>
            
            <div className="criteria-scores">
              <div className="criteria-item">
                <span className="criteria-name">Accuracy</span>
                <span className="criteria-score">{response_b.accuracy}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Relevance</span>
                <span className="criteria-score">{response_b.relevance}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Clarity</span>
                <span className="criteria-score">{response_b.clarity}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Completeness</span>
                <span className="criteria-score">{response_b.completeness}/10</span>
              </div>
              <div className="criteria-item">
                <span className="criteria-name">Usefulness</span>
                <span className="criteria-score">{response_b.usefulness}/10</span>
              </div>
            </div>

            <div className="strengths-weaknesses">
              <div className="strengths">
                <h4>✅ Strengths</h4>
                <ul>
                  {response_b.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="weaknesses">
                <h4>⚠️ Weaknesses</h4>
                <ul>
                  {response_b.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Comparison */}
        <div className="rubric-summary">
          <div className="summary-section">
            <h3>🔍 Overall Comparison</h3>
            <p>{overall_comparison}</p>
          </div>
          <div className="summary-section recommendation">
            <h3>💡 Recommendation</h3>
            <p>{recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// History Modal Component  -  
const HistoryModal = ({ history, onClose, onSelectQuery }) => {
  const getModeIcon = (mode) => {
    switch (mode) {
      case 'groq': return '⚡';
      case 'gemini': return '✨';
      case 'both': return '🔄';
      default: return '📝';
    }
  };

  const getModeLabel = (mode) => {
    switch (mode) {
      case 'groq': return 'Groq';
      case 'gemini': return 'Gemini';
      case 'both': return 'Both';
      default: return mode;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>📜 Query History</h2>
        <p className="history-subtitle">Your last 5 queries</p>
        
        <div className="history-list">
          {history.length === 0 ? (
            <div className="empty-history">
              <p>No query history yet</p>
              <small>Your queries will appear here once you start asking questions</small>
            </div>
          ) : (
            history.map((query) => (
              <div 
                key={query.id} 
                className="history-item"
                onClick={() => onSelectQuery(query)}
              >
                <div className="history-item-header">
                  <span className="history-mode-badge">
                    {getModeIcon(query.mode)} {getModeLabel(query.mode)}
                  </span>
                  <span className="history-timestamp">
                    {new Date(query.created_at).toLocaleDateString()} {new Date(query.created_at).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="history-prompt">
                  {query.prompt}
                </div>

                <div className="history-click-hint">
                  Click to view response
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};