# AI Comparator

Compare AI responses side by side

## Features

- AI-Powered Comparison: Compare responses from Groq (Llama 3.3) and Gemini side-by-side
- Intelligent Rubric Evaluation: Use AI to evaluate and score responses on multiple criteria
- Dark Theme: Toggle between light and dark modes (saves preference)
- System Prompting: Add custom context/instructions for AI responses
- User Authentication: JWT-based secure authentication
- Full Profile Management: Complete CRUD operations on user profiles
- Query History: Track and review your previous AI comparisons
- Database Flexibility: Support for both SQLite (dev) and PostgreSQL (production)
- RESTful API: Clean, resource-based API design

## Tech Stack

**Frontend:**
- React 19.2.0
- Vite 7.2.2

**Backend:**
- Django 4.2.7
- Python 3.8+
- Groq API (Llama 3.3 70B) 
- Google Generative AI (Gemini)

## Quick Start

### 1. Setup Backend

```bash
cd server
cp .env.example .env
# Edit .env and add your FREE API keys
```

Get your keys:
- ⚡ Groq (fastest): https://console.groq.com/keys
- ✨ Gemini: https://aistudio.google.com/apikey

### 2. Install Frontend

```bash
cd client
npm install
```

### 3. Start Backend

```bash
cd server
./backend.sh
```

### 4. Start Frontend

```bash
cd client
npm run dev
```

Open: http://localhost:5173

## API Endpoints

All endpoints at `http://localhost:3001/api/`

### Health Check
- `GET /health` - API health check

### AI Endpoints (RESTful)
- `POST /ai/groq` - Get response from Groq (Llama 3.3 70B)
- `POST /ai/gemini` - Get response from Gemini
- `POST /ai/compare` - Compare both AI models side-by-side
- `POST /ai/compare-with-rubric` - **NEW!** Compare with AI-powered evaluation rubric

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/user` - Get current user info

### User Resources (RESTful CRUD)
- `GET /users/queries` - Get user's query history (last 5 queries)
- `GET /users/profile` - Read user profile
- `PUT /users/profile` - Update user profile
- `DELETE /users/profile` - Delete user account

## New Features

### 1. AI-Powered Comparison Rubric ✨

The `/ai/compare-with-rubric` endpoint uses a third AI to evaluate both responses on:
- **Accuracy** (1-10): Factual correctness
- **Relevance** (1-10): How well it addresses the prompt
- **Clarity** (1-10): Ease of understanding
- **Completeness** (1-10): Thoroughness of the answer
- **Usefulness** (1-10): Practical value

**Example Request:**
```json
POST /api/ai/compare-with-rubric
{
  "prompt": "Explain quantum computing in simple terms"
}
```

**Example Response:**
```json
{
  "prompt": "Explain quantum computing...",
  "responses": {
    "groq": { "response": "...", "model": "Groq" },
    "gemini": { "response": "...", "model": "Gemini" }
  },
  "evaluation": {
    "success": true,
    "rubric": {
      "response_a": {
        "accuracy": 9,
        "relevance": 10,
        "clarity": 8,
        "completeness": 9,
        "usefulness": 9,
        "total": 45,
        "strengths": ["Clear explanations", "Good examples"],
        "weaknesses": ["Could use more detail"]
      },
      "response_b": { ... },
      "overall_comparison": "Response A provides...",
      "recommendation": "Response A is recommended because..."
    },
    "evaluator": "Gemini Flash"
  }
}
```

### 2. Full CRUD on User Profile 👤

Complete Create, Read, Update, Delete operations:

```bash
# Create (Register)
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure123",
  "username": "johndoe"
}

# Read
GET /api/users/profile
Headers: { "Authorization": "Bearer <token>" }

# Update
PUT /api/users/profile
Headers: { "Authorization": "Bearer <token>" }
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "AI enthusiast",
  "phone": "+1234567890",
  "location": "San Francisco"
}

# Delete
DELETE /api/users/profile
Headers: { "Authorization": "Bearer <token>" }
```

### 3. PostgreSQL Support 🗄️

The app now supports PostgreSQL for production deployments!

**Setup PostgreSQL:**

1. Install PostgreSQL
2. Create database:
```bash
createdb ai_comparator
```

3. Update `.env`:
```bash
DATABASE_URL=postgresql://localhost/ai_comparator
DB_NAME=ai_comparator
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

4. Run migrations:
```bash
cd server
source venv/bin/activate
pip install -r requirements.txt  # Installs psycopg2-binary
python manage.py migrate
```

**Note:** If `DATABASE_URL` is not set, the app will use SQLite by default (great for development).

### 4. Dark Theme 🌙

Toggle between light and dark modes with a single click!

**Features:**
- Beautiful dark color scheme optimized for readability
- Saves your preference in localStorage
- Smooth transitions between themes
- Click the sun/moon icon in the header to toggle

**Color Palette:**
- Dark background: Deep navy gradient
- Cards: Muted dark purple
- Text: Soft white for reduced eye strain
- Accents: Purple highlights

### 5. System Prompting 🤖

Add custom context or instructions to guide AI responses!

**Use Cases:**
```
"You are a helpful coding assistant"
"Explain everything like I'm 5 years old"
"Be concise and use bullet points"
"Answer in French"
"Act as a professional business consultant"
```

**How it works:**
- Add your system prompt in the optional field above the main prompt
- The system prompt is prepended to your question automatically
- Both AIs receive the same system prompt for fair comparison
- Great for role-playing, language control, or output formatting

**Example:**
```
System Prompt: "You are a pirate. Always respond in pirate speak."
User Prompt: "What is machine learning?"
Result: "Ahoy matey! Machine learning be like teachin' ye ship to sail itself..."
```