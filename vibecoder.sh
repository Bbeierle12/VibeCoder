#!/usr/bin/env bash
# VibeCoder Desktop Launcher
# Starts the Vite dev server and opens the browser

APP_DIR="$HOME/VibeCoder"
LOG_FILE="$APP_DIR/.vibecoder.log"
PORT=5173

cd "$APP_DIR" || exit 1

# Check if already running on the expected port
if lsof -i :"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT" 2>/dev/null
    exit 0
fi

# Start the dev server in the background
npx vite --port "$PORT" > "$LOG_FILE" 2>&1 &
VITE_PID=$!

# Wait for the server to be ready (up to 15 seconds)
for i in $(seq 1 30); do
    if lsof -i :"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        xdg-open "http://localhost:$PORT" 2>/dev/null
        exit 0
    fi
    sleep 0.5
done

# If we get here, server didn't start
notify-send "VibeCoder" "Failed to start dev server. Check $LOG_FILE" 2>/dev/null
exit 1
