import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Serve static files from root directory
app.use(express.static(__dirname));

let activeVisitors = 0;

function broadcastCount() {
  const message = JSON.stringify({ type: 'count', count: activeVisitors });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  activeVisitors++;
  broadcastCount();

  ws.on('close', () => {
    activeVisitors = Math.max(0, activeVisitors - 1);
    broadcastCount();
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
