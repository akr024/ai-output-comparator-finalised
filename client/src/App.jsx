import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import PromptForm from "./components/PromptForm";
import ResponseCard from "./components/ResponseCard";
import RubricEvaluation from "./components/RubricEvaluation";
import AuthModal from "./components/AuthModal";
import HistoryModal from "./components/HistoryModal";
import ProfileModal from "./components/ProfileModal";

// Hooks
import { useAuth } from "./hooks/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AI_MODELS = [
  { name: "Groq", badge: "Llama 3.3 70B", icon: "⚡", color: "groq", key: "groq" },
  { name: "Gemini", badge: "Google", icon: "✨", color: "gemini", key: "gemini" }
];

function App() {
  const { user, login, logout } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [responses, setResponses] = useState({});
  const [compareMode, setCompareMode] = useState('both');
  const [loading, setLoading] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const [rubricEvaluation, setRubricEvaluation] = useState(null);
  const [showRubric, setShowRubric] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // API: normal submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert("Please enter a question");

    setLoading(true);
    setResponses({});

    try {
      let endpoint =
        compareMode === "groq"
          ? `${API_BASE_URL}/api/ai/groq`
          : compareMode === "gemini"
          ? `${API_BASE_URL}/api/ai/gemini`
          : `${API_BASE_URL}/api/ai/compare`;

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body = {
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) throw new Error("Failed to get responses");

      if (compareMode === "groq") setResponses({ groq: data });
      else if (compareMode === "gemini") setResponses({ gemini: data });
      else setResponses(data);

    } catch (err) {
      alert("Failed to get AI responses. Check server.");
    } finally {
      setLoading(false);
    }
  };

  // API: rubric comparison
  const handleCompareWithRubric = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return alert("Please enter a question");

    setLoading(true);
    setResponses({});
    setRubricEvaluation(null);
    setShowRubric(false);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/ai/compare-with-rubric`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Failed to get responses");

      setResponses({
        groq: data.responses.groq,
        gemini: data.responses.gemini,
      });

      if (data.evaluation?.success) {
        setRubricEvaluation(data.evaluation);
        setShowRubric(true);
      }
    } catch (err) {
      alert("Rubric comparison failed.");
    } finally {
      setLoading(false);
    }
  };

  // history fetch
  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/users/queries`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error("Failed");

      setHistory(data.history || []);
    } catch {
      alert("Failed to fetch history");
    }
  };

  const handleShowHistory = () => {
    fetchHistory();
    setShowHistoryModal(true);
  };

  const handleClear = () => {
    setPrompt('');
    setSystemPrompt('');
    setResponses({});
    setRubricEvaluation(null);
    setShowRubric(false);
  };

  return (
    <Router>
      <div className="app">

        <Header
          user={user}
          darkMode={darkMode}
          onToggleTheme={toggleDarkMode}
          onLogout={logout}
          onShowHistory={handleShowHistory}
          onShowProfile={() => setShowProfileModal(true)}
        />

        <Routes>
          <Route path="/about" element={<About />} />

          <Route
            path="/login"
            element={<Login onSuccess={(u) => login(u.user, u.tokens.access)} />}
          />

          <Route
            path="/signup"
            element={<Signup onSuccess={(user, tokens) => login(user, tokens?.access)} />}
          />

          <Route
            path="/"
            element={
              <div className="container">

                <PromptForm
                  prompt={prompt}
                  systemPrompt={systemPrompt}
                  compareMode={compareMode}
                  loading={loading}
                  onPromptChange={setPrompt}
                  onSystemPromptChange={setSystemPrompt}
                  onCompareModeChange={setCompareMode}
                  onSubmit={handleSubmit}
                  onRubric={handleCompareWithRubric}
                  onClear={handleClear}
                />

                <div className="responses-section">
                  {AI_MODELS
                    .filter(m => compareMode === "both" || m.key === compareMode)
                    .map(m => (
                      <ResponseCard
                        key={m.key}
                        {...m}
                        data={responses[m.key]}
                        loading={loading}
                      />
                    ))}
                </div>

                {showRubric && rubricEvaluation && (
                  <RubricEvaluation evaluation={rubricEvaluation} />
                )}
              </div>
            }
          />
        </Routes>

        <Footer />

        {showHistoryModal && (
          <HistoryModal
            history={history}
            onClose={() => setShowHistoryModal(false)}
            onSelectQuery={(query) => {
              // Parse the prompt to separate system prompt and user prompt
              const fullPrompt = query.prompt;
              const separator = '\n\n';
              
              if (fullPrompt.includes(separator)) {
                const parts = fullPrompt.split(separator);
                // system prompt - then user prompt
                const systemPromptPart = parts[0];
                const userPromptPart = parts.slice(1).join(separator);
                
                setSystemPrompt(systemPromptPart);
                setPrompt(userPromptPart);
              } else {
                // user prompt only
                setSystemPrompt('');
                setPrompt(fullPrompt);
              }
              
              setCompareMode(query.mode);

              const r = {};
              if (query.responses.groq) {
                r.groq = {
                  model: 'Groq',
                  response: query.responses.groq,
                  timestamp: query.created_at,
                };
              }
              if (query.responses.gemini) {
                r.gemini = {
                  model: 'Gemini',
                  response: query.responses.gemini,
                  timestamp: query.created_at,
                };
              }
              setResponses(r);

              setShowHistoryModal(false);
            }}
          />
        )}

        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSuccess={(result) => {
              login(result.user, result.tokens.access);
              setShowAuthModal(false);
            }}
          />
        )}

        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} onLogout={logout} />
        )}
      </div>
    </Router>
  );
}

export default App;