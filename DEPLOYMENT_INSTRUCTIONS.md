# Video Streaming & WebSocket Fix - Deployment

## Changes Made

### 1. Server (`server/index.ts`)
- Multer now preserves file extensions: `filename-timestamp.ext`
- MIME type detection for video files (.mp4, .mkv, .webm, etc.)
- Range request support for video seeking
- CORS headers for video access

### 2. Frontend
- **Video** (`src/pages/Room.tsx`): Uses `<source>` tag, force re-render on URL change
- **WebSocket** (`src/hooks/useRoomWebSocket.ts`): **FIXED** - Now connects to `wss://hostname/ws` instead of API host

### 3. Nginx (`nginx-grooveshare.conf`)
- `/uploads/`: Proxy with `proxy_buffering off` for streaming
- `/ws`: WebSocket upgrade headers with 24-hour timeout

## Deploy to Production

```bash
# 1. Update Nginx
sudo cp nginx-grooveshare.conf /etc/nginx/sites-available/grooveshare
sudo nginx -t
sudo systemctl reload nginx

# 2. Deploy code
cd /home/deploy/grooveshare
git pull origin main
bun run build
pm2 restart grooveshare
```

## Test

- Visit https://grooveshare.net
- Open browser console (F12)
- Should see: "WebSocket connected"
- Upload and play a video
- Video should stream smoothly
- Seeking should work

## Troubleshooting

**WebSocket fails**: Check Nginx is running and `/ws` location exists
**Video won't play**: Check browser console for errors
**Slow streaming**: Verify `proxy_buffering off` in Nginx

