# HomeMadeKahoot

English learning quiz platform inspired by Kahoot, designed to make language learning engaging and interactive through game-based quizzes.

## 🚀 Quick Start

## 🌐 Deployment Options

The application supports **two deployment methods** that can be used independently or together:

### Option 1: Cloudflare Tunnels (Local Development with Public URLs)

**Best for:** Local development when you need to share your app publicly (e.g., testing on mobile devices, sharing with team members).

**How it works:**
- Run `Run_All.ps1` - it automatically creates Cloudflare tunnels for Dev & Prod environments
- URLs are generated automatically and saved to `.env.cloudflare`
- Your local servers become accessible via public URLs (e.g., `https://xxx.trycloudflare.com`)
- **No account needed** - Cloudflare tunnels work out of the box

**Setup:** Just run `Run_All.ps1` - everything is automated!

### Option 2: Render (Production Deployment)

**Best for:** Permanent production deployments, hosting your app 24/7.

**How it works:**
- Deploy frontend and backend as separate services on Render
- Set environment variables in Render dashboard (no Cloudflare needed)
- Your app runs on permanent URLs (e.g., `https://your-app.onrender.com`)
- **Free tier available** with automatic SSL

**Setup:**
1. **Frontend Service** - Set these in Render:
   - `REACT_APP_API_URL` = `https://your-backend.onrender.com/api`
   - `REACT_APP_SOCKET_URL` = `https://your-backend.onrender.com`
   
2. **Backend Service** - Set these in Render:
   - `FRONTEND_URL` = `https://your-frontend.onrender.com`
   - `MONGODB_URI`, `JWT_SECRET`, and all API keys

### Using Both Together

You can use **both methods simultaneously**:
- **Local/Dev environments** → Use Cloudflare tunnels (via `Run_All.ps1`)
- **Production** → Deploy to Render with environment variables

The app automatically detects which method to use:
1. ✅ **Cloudflare URLs** (if `.env.cloudflare` exists with valid URLs)
2. ✅ **Environment Variables** (if Cloudflare URLs not available)
3. ✅ **Localhost** (fallback for local development)

**Note:** Local environment always uses localhost (no Cloudflare or Render needed).

### First Time Setup

1. **Install Dependencies**
   ```powershell
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. **Create Environment Files**
   - `backend/.env.local` - Local environment config
   - `backend/.env.dev` - Development environment config
   - `backend/.env.prod` - Production environment config
   - Each should contain: `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`, and API keys

### Running the Application

**One Master Script - Does Everything!**

Simply run:

```powershell
.\Run_All.ps1
```

This single script will:
1. ✅ Start Local environment (ports 5010, 3010)
2. ✅ Start Development environment (ports 5020, 3020)
3. ✅ Start Production environment (ports 5030, 3030)
4. ✅ Wait for servers to be ready
5. ✅ Automatically set up Cloudflare tunnels for Dev & Prod
6. ✅ Automatically extract URLs from tunnel output
7. ✅ Automatically update `.env.cloudflare` file
8. ✅ Restart Dev & Prod environments with Cloudflare URLs
9. ✅ Show a complete summary of all URLs

**Press Ctrl+C to stop all environments and tunnels**

## 📋 What the Script Does

The `Run_All.ps1` script automates everything:

1. **Starts all 3 environments** (Local, Dev, Prod) in separate windows
2. **Waits for servers** to be ready (15 seconds)
3. **Creates Cloudflare tunnels** automatically for Dev & Prod
4. **Extracts URLs** from tunnel output automatically
5. **Updates `.env.cloudflare`** file with new URLs
6. **Restarts Dev & Prod** environments to use Cloudflare URLs
7. **Shows a summary** with all URLs (Local, Dev, Prod - both frontend and backend)

No manual steps needed! Just run one script and everything is set up.

## 📊 Environment Configuration

| Environment | Backend Port | Frontend Port | Database | Uses Cloudflare? |
|------------|--------------|---------------|----------|------------------|
| **Local** | 5010 | 3010 | `homemadekahoot_local` | ❌ No |
| **Development** | 5020 | 3020 | `homemadekahoot_dev` | ✅ Yes (optional) |
| **Production** | 5030 | 3030 | `homemadekahoot_prod` | ✅ Yes (optional) |

## 🔧 Cloudflare Configuration

### `.env.cloudflare` File Format

When using Cloudflare tunnels, URLs are automatically saved to `.env.cloudflare`:

```env
# Development Environment
development_Backend=https://your-dev-backend-url.trycloudflare.com
development_frontend=https://your-dev-frontend-url.trycloudflare.com

# Production Environment
production_Backend=https://your-prod-backend-url.trycloudflare.com
production_frontend=https://your-prod-frontend-url.trycloudflare.com
```

**Note:** This file is created automatically by `Run_All.ps1`. You don't need to create it manually.

### Important Notes

- **Cloudflare Tunnels**: Run `Run_All.ps1` - it automatically sets up tunnels and updates URLs
- **Render Deployment**: Just set environment variables in Render dashboard - no Cloudflare needed
- **Both Together**: Use Cloudflare for local/dev, Render for production
- **Local Environment**: Always uses localhost (no Cloudflare or Render needed)
- **Automatic Detection**: App chooses the right method based on what's available

### After Restarting Your Computer

Simply run `Run_All.ps1` again - it will:
- Start all environments
- Get new Cloudflare URLs automatically
- Update `.env.cloudflare` automatically
- Restart environments with new URLs

## 📁 Project Structure

```
HomeMadeKahoot/
├── backend/                    # Backend server (Node.js/Express)
│   ├── .env.local             # Local environment config
│   ├── .env.dev               # Development environment config
│   ├── .env.prod              # Production environment config
│   ├── server.js              # Main server file
│   ├── utils/
│   │   └── cloudflareConfig.js # Cloudflare URL loader
│   └── ...
├── frontend/                   # Frontend app (React)
│   ├── src/                   # Source files
│   ├── scripts/
│   │   └── setupCloudflareEnv.js # Environment setup script
│   └── ...
├── .env.cloudflare             # Cloudflare tunnel URLs (optional, for local dev)
├── Run_All.ps1                 # Master script - runs everything automatically
└── README.md                   # This file
```

## 🎯 Features

### Quiz System
- **Live Quizzes**: Host real-time quiz sessions with PIN codes
- **Self-Paced Mode**: Practice quizzes individually
- **AI Quiz Generation**: Generate quizzes from PDFs, SRT files, or YouTube videos
- **Real-Time Leaderboard**: Live scoring during quiz sessions

### Flashcard System
- **Deck Creation**: Build custom flashcard decks
- **AI Deck Maker**: Extract words from files and create decks automatically
- **Interactive Study**: Study with swipe gestures and keyboard shortcuts
- **Pronunciation Assessment**: AI-powered pronunciation feedback

### Word Database
- **Word Management**: Comprehensive English-Turkish vocabulary database
- **Advanced Filtering**: Filter by level, category, known/unknown status
- **Import/Export**: Import from Excel, export your collection
- **Source Tracking**: Track where words came from

### Dashboard & Analytics
- **Statistics Overview**: View learning progress and metrics
- **Badge System**: Earn badges based on vocabulary milestones
- **Study Time Tracking**: Automatic tracking across all modules
- **Visual Analytics**: Interactive charts and graphs

## 🔐 Environment Variables

### Backend Environment Files (Local Development)

Each environment needs its own `.env` file in the `backend/` directory:

**`.env.local`, `.env.dev`, `.env.prod`:**
```env
NODE_ENV=local|development|production
PORT=5010|5020|5030
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://localhost:3010|3020|3030

# API Keys
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key
UNSPLASH_ACCESS_KEY=your_key
FIRECRAWL_API_KEY=your_key
AZURE_SPEECH_KEY=your_key
AZURE_SPEECH_REGION=your_region
```

### Render Deployment Environment Variables

**Frontend Service:**
- `REACT_APP_API_URL` - Backend API URL (e.g., `https://your-backend.onrender.com/api`)
- `REACT_APP_SOCKET_URL` - Backend Socket URL (e.g., `https://your-backend.onrender.com`)
- `PORT` - Port number (usually `10000` or Render's assigned port)

**Backend Service:**
- `FRONTEND_URL` - Frontend URL (e.g., `https://your-frontend.onrender.com`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- All API keys (same as local development)

## 🗄️ Database Management

Each environment uses a separate database:
- **Local**: `homemadekahoot_local`
- **Development**: `homemadekahoot_dev`
- **Production**: `homemadekahoot_prod`

Databases are created automatically when you first run each environment.

## 🛠️ Manual Commands

**Note:** These commands are optional. `Run_All.ps1` handles everything automatically, but you can run individual environments manually if needed:

### Local Environment
```powershell
# Backend
cd backend
npm run start:local

# Frontend (new terminal)
cd frontend
npm run start:local
```

### Development Environment
```powershell
# Backend
cd backend
npm run start:dev

# Frontend (new terminal)
cd frontend
npm run start:dev
```

### Production Environment
```powershell
# Backend
cd backend
npm run start:prod

# Frontend (new terminal)
cd frontend
npm run start:prod
```

## 📝 Notes

- **Deployment Methods**: Choose Cloudflare (local dev with public URLs) or Render (production hosting) or both
- **Local environment** always uses localhost (no Cloudflare or Render)
- **Development & Production** can use Cloudflare tunnels OR Render deployment
- All 3 environments can run **simultaneously** without conflicts
- Cloudflare URLs are stored in `.env.cloudflare` and persist after restart
- Render uses environment variables set in the dashboard
- Never commit `.env` files or `.env.cloudflare` to git
- **Run_All.ps1** automatically handles Cloudflare setup - no manual steps needed

## 🆘 Troubleshooting

### Port Already in Use
- Make sure no other instance is running on that port
- Check with: `netstat -ano | findstr :5010` (or 5020, 5030)

### Can't Connect to Database
- Check your `MONGODB_URI` in the backend `.env` file
- Make sure the database name matches the environment

### Frontend Can't Connect to Backend
- **Cloudflare mode**: Check `.env.cloudflare` has the correct URLs, or run `Run_All.ps1` to regenerate
- **Render mode**: Verify `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` are set correctly in Render dashboard
- Make sure backend is running and accessible
- Check browser console for CORS errors
- Verify backend URL matches your deployment method (Cloudflare tunnel or Render URL)

### Cloudflare Tunnels Can't Connect
- **Make sure Dev/Prod environments are running FIRST!**
- The servers must be running on ports 5020, 3020, 5030, 3030 before creating tunnels
- Check that the ports are correct in the tunnel commands

### Cloudflare URLs Not Working
- Run `Run_All.ps1` - it automatically handles everything
- The script automatically extracts URLs and updates `.env.cloudflare`
- If URLs aren't extracted automatically, check the temp log files in `%TEMP%\cloudflare_*.log`
- **Alternative**: Use Render deployment instead - just set environment variables (no Cloudflare needed)

### Render Deployment Issues
- Make sure `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` are set in Render frontend environment variables
- Make sure `FRONTEND_URL` is set in Render backend environment variables
- URLs should be your Render service URLs (e.g., `https://your-app.onrender.com`)
- The app automatically detects and uses environment variables when Cloudflare URLs aren't available

## 📚 Tech Stack

- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Frontend**: React, React Router, Axios
- **Authentication**: JWT
- **Real-time**: Socket.io
- **AI Services**: OpenAI (via OpenRouter), Google Gemini, Azure Speech

---

**Happy Learning!** 🎉
