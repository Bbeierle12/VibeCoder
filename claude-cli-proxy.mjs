#!/usr/bin/env node

/**
 * Claude CLI Proxy Server
 * 
 * This proxy server connects VibeCoder to the Claude CLI, allowing you to use
 * your Claude subscription limits directly from the web interface.
 * 
 * Usage:
 *   node claude-cli-proxy.js
 *   # or via npm script:
 *   npm run claude-proxy
 * 
 * The server will listen on http://localhost:3456 by default.
 * Set PORT environment variable to change the port.
 * 
 * Prerequisites:
 *   1. Install Claude Code CLI: npm install -g @anthropic-ai/claude-code
 *   2. Login to Claude: claude login
 */

import { spawn } from 'child_process';
import * as http from 'http';

const PORT = parseInt(process.env.PORT || '3456', 10);

// Model aliases - the CLI accepts these directly
const VALID_MODELS = ['opus', 'sonnet', 'haiku'];

// Escape string for Windows shell
function escapeShellArg(arg) {
  // Replace double quotes with escaped quotes and wrap in quotes
  return `"${arg.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

// CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function handleChatCompletion(req, res) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const request = JSON.parse(body);
      const { model, messages, stream = true } = request;

      // Build the prompt from messages
      let systemPrompt = '';
      
      for (const msg of messages) {
        if (msg.role === 'system') {
          systemPrompt = msg.content;
          break;
        }
      }

      // Get the last user message for the prompt
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No user message found' }));
        return;
      }

      // Build claude command arguments
      // Use model alias directly (opus, sonnet, haiku)
      const args = [
        '-p',  // Print mode (non-interactive)
        '--model', model,
        '--dangerously-skip-permissions',  // Skip trust dialogs
      ];

      if (systemPrompt) {
        args.push('--system-prompt', escapeShellArg(systemPrompt));
      }

      // Add the prompt
      args.push(escapeShellArg(lastUserMessage.content));

      console.log(`[Claude CLI] Model: ${model}`);
      console.log(`[Claude CLI] Prompt: ${lastUserMessage.content.substring(0, 100)}...`);
      console.log(`[Claude CLI] Command: claude ${args.join(' ')}`);

      if (stream) {
        res.writeHead(200, {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        const claude = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });

        let fullContent = '';

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
          console.error('[Claude CLI stderr]:', data.toString());
        });

        claude.on('close', (code) => {
          if (code !== 0) {
            console.error(`[Claude CLI] Process exited with code ${code}`);
          }
          sendSSE(res, {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            choices: [{
              delta: {},
              finish_reason: 'stop'
            }]
          });
          res.write('data: [DONE]\n\n');
          res.end();
          console.log(`[Claude CLI] Response complete (${fullContent.length} chars)`);
        });

        claude.on('error', (error) => {
          console.error('[Claude CLI] Failed to start:', error.message);
          sendSSE(res, { error: error.message });
          res.end();
        });

      } else {
        // Non-streaming response
        const claude = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true
        });

        let fullContent = '';
        let errorContent = '';

        claude.stdout.on('data', (data) => {
          fullContent += data.toString();
        });

        claude.stderr.on('data', (data) => {
          errorContent += data.toString();
        });

        claude.on('close', (code) => {
          if (code !== 0) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorContent || `Process exited with code ${code}` }));
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
          res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
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
╔════════════════════════════════════════════════════════════╗
║           Claude CLI Proxy Server Running                  ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server URL: http://localhost:${PORT}                       ║
║                                                            ║
║  Endpoints:                                                ║
║    POST /v1/chat/completions - Chat completions            ║
║    GET  /v1/models          - List available models        ║
║    GET  /health             - Health check                 ║
║                                                            ║
║  Make sure 'claude' CLI is installed and authenticated:    ║
║    npm install -g @anthropic-ai/claude-code                ║
║    claude login                                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy server...');
  server.close(() => {
    process.exit(0);
  });
});
