#!/usr/bin/env node

/**
 * Claude CLI Proxy Server
 *
 * This proxy server connects VibeCoder to the Claude CLI, allowing you to use
 * your Claude subscription limits directly from the web interface.
 *
 * Usage:
 *   node claude-cli-proxy.mjs
 *   # or via npm script:
 *   npm run claude-proxy
 *
 * The server will listen on http://localhost:3456 by default.
 *
 * Environment Variables:
 *   PORT            - Server port (default: 3456)
 *   CORS_ORIGIN     - Allowed CORS origin (default: * for development)
 *   CLAUDE_TIMEOUT  - CLI timeout in ms (default: 300000 = 5 minutes)
 *   SKIP_PERMISSIONS - Skip permission dialogs (default: true)
 *   MAX_BODY_SIZE   - Max request body size in bytes (default: 1048576 = 1MB)
 *
 * Prerequisites:
 *   1. Install Claude Code CLI: npm install -g @anthropic-ai/claude-code
 *   2. Login to Claude: claude login
 */

import { spawn } from 'child_process';
import * as http from 'http';

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || '3456', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const CLAUDE_TIMEOUT = parseInt(process.env.CLAUDE_TIMEOUT || '300000', 10); // 5 minutes
const SKIP_PERMISSIONS = process.env.SKIP_PERMISSIONS !== 'false';
const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || '1048576', 10); // 1MB

// Model aliases - the CLI accepts these directly
const VALID_MODELS = ['opus', 'sonnet', 'haiku'];

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Build the full conversation prompt from messages array.
 * Preserves full conversation history for multi-turn context.
 */
function buildConversationPrompt(messages) {
  let systemPrompt = '';
  const conversationParts = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user') {
      conversationParts.push(`Human: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      conversationParts.push(`Assistant: ${msg.content}`);
    }
  }

  return { systemPrompt, conversation: conversationParts.join('\n\n') };
}

/**
 * Get user-friendly error message for common CLI errors
 */
function getErrorMessage(error, stderr) {
  const errorStr = error?.message || '';
  const stderrStr = stderr || '';

  if (errorStr.includes('ENOENT') || errorStr.includes('not found')) {
    return 'Claude CLI not installed. Run: npm install -g @anthropic-ai/claude-code';
  }
  if (stderrStr.includes('not authenticated') || stderrStr.includes('login')) {
    return 'Claude CLI not authenticated. Run: claude login';
  }
  if (stderrStr.includes('rate limit')) {
    return 'Rate limit exceeded. Please wait and try again.';
  }

  return stderrStr || errorStr || 'Unknown error occurred';
}

async function handleChatCompletion(req, res) {
  let body = '';
  let bodySize = 0;

  req.on('data', chunk => {
    bodySize += chunk.length;
    if (bodySize > MAX_BODY_SIZE) {
      res.writeHead(413, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Request body too large. Maximum size: ${MAX_BODY_SIZE} bytes` }));
      req.destroy();
      return;
    }
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const request = JSON.parse(body);
      const { model, messages, stream = true } = request;

      // Validate model
      if (!VALID_MODELS.includes(model)) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: `Invalid model: ${model}. Valid models: ${VALID_MODELS.join(', ')}`
        }));
        return;
      }

      // Validate messages
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Messages array is required' }));
        return;
      }

      // Check for at least one user message
      const hasUserMessage = messages.some(m => m.role === 'user');
      if (!hasUserMessage) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No user message found' }));
        return;
      }

      // Build full conversation with history preserved
      const { systemPrompt, conversation } = buildConversationPrompt(messages);

      // Build claude command arguments - NO shell: true for security
      const args = ['-p', '--model', model];

      if (SKIP_PERMISSIONS) {
        args.push('--dangerously-skip-permissions');
      }

      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }

      // Add the full conversation as the prompt
      args.push(conversation);

      console.log(`[Claude CLI] Model: ${model}`);
      console.log(`[Claude CLI] Messages: ${messages.length} (${messages.filter(m => m.role === 'user').length} user, ${messages.filter(m => m.role === 'assistant').length} assistant)`);
      console.log(`[Claude CLI] Conversation length: ${conversation.length} chars`);

      if (stream) {
        res.writeHead(200, {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        // SECURITY: shell: false prevents shell injection
        const claude = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        });

        let fullContent = '';
        let errorContent = '';
        let timedOut = false;

        // Set timeout
        const timeout = setTimeout(() => {
          timedOut = true;
          claude.kill('SIGTERM');
          console.error(`[Claude CLI] Process timed out after ${CLAUDE_TIMEOUT}ms`);
        }, CLAUDE_TIMEOUT);

        claude.stdout.on('data', (data) => {
          const text = data.toString();
          fullContent += text;

          sendSSE(res, {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            choices: [{
              delta: { content: text },
              finish_reason: null
            }]
          });
        });

        claude.stderr.on('data', (data) => {
          errorContent += data.toString();
          console.error('[Claude CLI stderr]:', data.toString());
        });

        claude.on('close', (code) => {
          clearTimeout(timeout);

          if (timedOut) {
            sendSSE(res, { error: `Request timed out after ${CLAUDE_TIMEOUT / 1000} seconds` });
          } else if (code !== 0 && fullContent.length === 0) {
            console.error(`[Claude CLI] Process exited with code ${code}`);
            sendSSE(res, { error: getErrorMessage(null, errorContent) });
          }

          sendSSE(res, {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            choices: [{
              delta: {},
              finish_reason: timedOut ? 'timeout' : 'stop'
            }]
          });
          res.write('data: [DONE]\n\n');
          res.end();
          console.log(`[Claude CLI] Response complete (${fullContent.length} chars)`);
        });

        claude.on('error', (error) => {
          clearTimeout(timeout);
          const errorMsg = getErrorMessage(error, errorContent);
          console.error('[Claude CLI] Failed to start:', errorMsg);
          sendSSE(res, { error: errorMsg });
          res.end();
        });

      } else {
        // Non-streaming response
        // SECURITY: shell: false prevents shell injection
        const claude = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: false
        });

        let fullContent = '';
        let errorContent = '';
        let timedOut = false;

        // Set timeout
        const timeout = setTimeout(() => {
          timedOut = true;
          claude.kill('SIGTERM');
        }, CLAUDE_TIMEOUT);

        claude.stdout.on('data', (data) => {
          fullContent += data.toString();
        });

        claude.stderr.on('data', (data) => {
          errorContent += data.toString();
        });

        claude.on('close', (code) => {
          clearTimeout(timeout);

          if (timedOut) {
            res.writeHead(504, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Request timed out after ${CLAUDE_TIMEOUT / 1000} seconds` }));
            return;
          }

          if (code !== 0) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: getErrorMessage(null, errorContent) }));
            return;
          }

          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            choices: [{
              message: {
                role: 'assistant',
                content: fullContent
              },
              finish_reason: 'stop'
            }]
          }));
        });

        claude.on('error', (error) => {
          clearTimeout(timeout);
          res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: getErrorMessage(error, errorContent) }));
        });
      }

    } catch (error) {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }));
    }
  });
}

function handleModels(res) {
  res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    data: [
      { id: 'opus', object: 'model' },
      { id: 'sonnet', object: 'model' },
      { id: 'haiku', object: 'model' },
    ]
  }));
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
    handleChatCompletion(req, res);
  } else if (url.pathname === '/v1/models' && req.method === 'GET') {
    handleModels(res);
  } else if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║             Claude CLI Proxy Server Running                    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Server URL: http://localhost:${String(PORT).padEnd(5)}                            ║
║                                                                ║
║  Configuration:                                                ║
║    CORS Origin:      ${CORS_ORIGIN.substring(0, 20).padEnd(20)}                    ║
║    Timeout:          ${(CLAUDE_TIMEOUT / 1000)}s                                       ║
║    Skip Permissions: ${SKIP_PERMISSIONS}                                    ║
║    Max Body Size:    ${(MAX_BODY_SIZE / 1024).toFixed(0)}KB                                      ║
║                                                                ║
║  Endpoints:                                                    ║
║    POST /v1/chat/completions - Chat completions                ║
║    GET  /v1/models           - List available models           ║
║    GET  /health              - Health check                    ║
║                                                                ║
║  Prerequisites:                                                ║
║    npm install -g @anthropic-ai/claude-code                    ║
║    claude login                                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy server...');
  server.close(() => {
    process.exit(0);
  });
});
