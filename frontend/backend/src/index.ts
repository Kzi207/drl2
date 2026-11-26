import http from 'http';
import app from './app.js';
import { initWebSocketServer } from './utils/websocket.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Trigger reload for new env parameters (Google OAuth credentials)
