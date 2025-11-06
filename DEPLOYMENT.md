# Deployment Guide

Step-by-step guide to deploy HomeMadeKahoot to production.

## 🚀 Option 1: Render (Recommended)

### Backend Deployment

1. Go to [Render.com](https://render.com) → **New +** → **Web Service**
2. Connect GitHub repository
3. Configure:
   - **Name:** `homemadekahoot-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

4. **Environment Variables:**
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/homemadekahoot
   JWT_SECRET=your_secret_key
   NODE_ENV=production
   UNSPLASH_ACCESS_KEY=your_key
   OPENROUTER_API_KEY=your_key
   FRONTEND_URL=https://your-frontend-url.onrender.com
   ```
   ⚠️ **No trailing slashes** in URLs

5. Wait for deployment (5-10 min)

### Frontend Deployment

1. **New +** → **Static Site**
2. Connect GitHub repository
3. Configure:
   - **Name:** `homemadekahoot-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`

4. **Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
   ```

5. **Configure Rewrites** (Settings → Redirects and Rewrites):
   - Source: `/*`
   - Destination: `/index.html`
   - Type: **Rewrite** (not Redirect)
   - Status: `200`

6. Wait for deployment

### Update URLs

After getting both URLs, update:
- Backend: `FRONTEND_URL` → Your frontend URL
- Frontend: `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` → Your backend URL

---

## 🔀 Deploy Both Production and Development Versions

You can deploy both production and development versions simultaneously on Render.

### Option 1: Separate Services (Recommended)

**Production (Main App):**
- Service name: `homemadekahoot-backend` and `homemadekahoot-frontend`
- Branch: `master` (or `main`)
- URL: `homemadekahoot-frontend.onrender.com`
- Environment: `NODE_ENV=production`

**Development (Testing):**
- Service name: `homemadekahoot-backend-dev` and `homemadekahoot-frontend-dev`
- Branch: `dev`
- URL: `homemadekahoot-frontend-dev.onrender.com`
- Environment: `NODE_ENV=development`

**Steps:**
1. The `dev` branch is already created in the repository
2. In Render, create new services (same steps as production)
3. Set branch to `dev` in Render settings (Settings → Build & Deploy → Branch)
4. Use different MongoDB databases or collections for dev (optional)
5. Set `NODE_ENV=development` in dev services

### Option 2: Different Platforms

- **Production:** Render (main services)
- **Development:** Local machine or Railway/Vercel

### Option 3: Environment-Based URLs

Use the same codebase but different environment variables:
- Production: `FRONTEND_URL=https://homemadekahoot-frontend.onrender.com`
- Development: `FRONTEND_URL=https://homemadekahoot-dev.onrender.com`

**Benefits:**
- Test features before deploying to production
- Keep production stable while developing
- Use separate databases (optional)

**Note:** Free tier allows multiple services, so you can have both running!

---

## 🗄️ MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
4. **Database Access** → Create user → Save password
5. **Connect** → Get connection string → Replace `<password>` and add database name

---

## 🔄 Automatic Deployments

When GitHub is connected, Render automatically deploys on every `git push`.

**Verify:** Settings → Build & Deploy → Auto-Deploy should be **Yes**

**Manual Deploy:** Click "Manual Deploy" button in dashboard

---

## 🐛 Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` has no trailing slash
- Check backend CORS includes frontend URL

### Empty Page on Refresh
- Ensure rewrite (not redirect) is configured in Render
- Check `_redirects` file exists in `frontend/public/`

### MongoDB Connection Failed
- Verify Network Access allows `0.0.0.0/0`
- Check connection string has correct password
- Wait 1-2 minutes after IP changes

### Socket.io Connection Fails
- Verify `FRONTEND_URL` matches frontend URL exactly
- Check CORS settings in backend

---

## 📝 Quick Reference

### Backend Environment Variables
```env
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
NODE_ENV=production
UNSPLASH_ACCESS_KEY=your_key
OPENROUTER_API_KEY=your_key
FRONTEND_URL=https://your-frontend-url.onrender.com
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend-url.onrender.com
```

---

## 💡 Tips

- **Free Tier Spin-Down**: Services automatically spin down after 15 minutes of inactivity
- **Auto-Restart**: Services automatically restart when you make a request (no manual action needed)
- **Cold Start**: First request after spin-down takes 30-60 seconds (this is normal)
- Test locally before deploying
- Check deployment logs if something fails
- Keep `master`/`main` branch stable for auto-deploy

---

**Need Help?** Check platform docs:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
