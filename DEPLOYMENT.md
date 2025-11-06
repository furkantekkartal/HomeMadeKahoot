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

- Free tier spins down after 15 min inactivity (first request may take 30-60s)
- Test locally before deploying
- Check deployment logs if something fails
- Keep `master`/`main` branch stable for auto-deploy

---

**Need Help?** Check platform docs:
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
