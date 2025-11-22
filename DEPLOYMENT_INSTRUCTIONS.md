# Video Streaming & WebSocket Fix - Deployment

## Changes Made

### 1. Server (`server/index.ts`)

- **Multer**: Preserves file extensions: `filename-timestamp.ext`
- **MIME Types**: Auto-detects video files (.mp4, .mkv, .webm, etc.)
- **Range Requests**: Enables HTTP range requests for seeking
- **CORS**: Added proper headers for video access
- **WebSocket**: Changed from `server` mode to `noServer` mode with manual upgrade handling on `/ws` path

### 2. Frontend

- **Video** (`src/pages/Room.tsx`): Uses `<source>` tag, force re-render on URL change
- **WebSocket** (`src/hooks/useRoomWebSocket.ts`): Connects to `wss://hostname/ws` through Nginx

### 3. Nginx (`nginx-grooveshare.conf`)

- `/uploads/`: Proxy with `proxy_buffering off` for smooth streaming
- `/ws`: WebSocket upgrade with proper headers and 24-hour timeout

## Deploy to Production

```bash
# 1. Update Nginx config
sudo cp nginx-grooveshare.conf /etc/nginx/sites-available/grooveshare
sudo nginx -t  # Verify syntax
sudo systemctl reload nginx

# 2. Deploy code
cd /home/deploy/grooveshare
git pull origin main
bun run build
pm2 restart grooveshare

# 3. Verify
curl http://localhost:4000/api/auth/me  # Should return 401
```

## Test on Production

1. Visit https://grooveshare.net
2. Open browser console (F12)
3. Should see: "WebSocket connected"
4. Upload and play a video
5. Video should stream smoothly
6. Seeking should work
7. Real-time sync with multiple users

## Troubleshooting

**WebSocket fails**:

- Check: `sudo systemctl status nginx`
- Check: `/var/log/nginx/error.log`
- Verify: `/ws` location in Nginx config

**Video won't play**:

- Check browser console (F12)
- Verify: `Accept-Ranges: bytes` header

**Slow streaming**:

- Verify: `proxy_buffering off` in Nginx
