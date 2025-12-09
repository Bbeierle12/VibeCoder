<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jIRLkU1aPJUs8WCLNtEoiZAVGQc4OBHo

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## AI Providers

VibeCoder supports multiple AI providers:

### Gemini (Default)
Uses Google's Gemini API. Requires `GEMINI_API_KEY` environment variable.

### Local LLM (Ollama/LM Studio)
Connect to locally running LLMs via Ollama or LM Studio. Configure in Settings.

### Claude CLI (Use Your Subscription)
Use your Claude subscription limits directly! This requires the Claude Code CLI.

**Setup:**
1. Install Claude Code CLI:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. Login to Claude:
   ```bash
   claude login
   ```

3. Start the proxy server (in a separate terminal):
   ```bash
   npm run claude-proxy
   ```

4. In VibeCoder Settings, select "Claude CLI" and test the connection.

Available models:
- Claude Sonnet 4 (claude-sonnet-4-20250514) - Balanced performance
- Claude Opus 4 (claude-opus-4-20250514) - Most capable  
- Claude 3.5 Sonnet (claude-3-5-sonnet-20241022) - Great for coding
- Claude 3.5 Haiku (claude-3-5-haiku-20241022) - Fast and efficient
