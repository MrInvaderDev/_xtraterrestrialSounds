# Music Player Backend Setup

This backend server tracks play counts server-side so they persist across all users and devices.

## Local Development

### Prerequisites
- Node.js 16+ installed
- npm installed

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

3. **Update your frontend** (already done if you're reading this):
   - The `API_URL` in `app.js` is set to `http://localhost:3000/api`
   - Make sure your music files are served from the same server or with CORS enabled

4. **Test the API**:
   - Get all songs: `curl http://localhost:3000/api/songs`
   - Increment a play count: `curl -X POST http://localhost:3000/api/songs/1/play`

## Database

The server uses SQLite3 (stored in `playcounts.db`). The database is created automatically on first run.

### Database Schema
```sql
CREATE TABLE songs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    playCount INTEGER DEFAULT 0,
    lastPlayed DATETIME
)
```

## Deployment Options

### Option 1: Render (Recommended - Free tier available)

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Set the following:
   - **Name**: music-player-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Click "Create Web Service"

After deployment, you'll get a URL like `https://music-player-backend.onrender.com`

Update the `API_URL` in `app.js`:
```javascript
const API_URL = 'https://your-render-url.onrender.com/api';
```

### Option 2: Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "GitHub Repo"
4. Choose your repository
5. Railway will auto-detect the Node.js app
6. Deploy!

Update `API_URL` with your Railway URL.

### Option 3: Heroku (requires credit card)

1. Install Heroku CLI
2. Run:
   ```bash
   heroku create music-player-backend
   git push heroku main
   ```

## Frontend Configuration

After deploying, update the `API_URL` in your `app.js` file to point to your deployed backend:

```javascript
const API_URL = 'https://your-deployed-url.com/api';
```

## API Endpoints

- **GET /api/songs** - Get all songs with play counts
- **GET /api/songs/:id** - Get a specific song
- **POST /api/songs/:id/play** - Increment play count for a song
- **POST /api/songs/init/:id/:title/:artist** - Initialize a song (idempotent)

## Troubleshooting

**"Connection refused" error in browser console?**
- Make sure your backend server is running
- Check that the `API_URL` in `app.js` matches your server URL
- If using different domains, ensure CORS is enabled (it is by default in `server.js`)

**Play counts not persisting?**
- Check the browser console for error messages
- Verify the server is running: visit `http://localhost:3000` in your browser
- Check that `playcounts.db` file is created in your project directory

**Deployment issues?**
- Make sure `package.json` and `server.js` are in the root directory
- Check deployment logs on your hosting provider
- Ensure Node.js version is compatible (16.x recommended)
