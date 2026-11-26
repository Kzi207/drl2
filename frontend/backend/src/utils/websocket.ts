import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

export interface AttendanceWebSocketEvent {
  type: 'ATTENDANCE_CHECKED_IN' | 'ATTENDANCE_REMOVED' | 'DAILY_ATTENDANCE_UPDATED';
  sessionId?: number;
  student?: any;
  date?: string;
  status?: string;
  verification?: {
    baselineCreated?: boolean;
    verifiedIp?: boolean | null;
    verifiedLocation?: boolean | null;
  };
  timestamp?: string;
}

let wss: WebSocketServer | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

export const initWebSocketServer = (httpServer: HttpServer): WebSocketServer => {
  if (wss) {
    return wss;
  }

  wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
  });

  console.log('[WebSocket] Server initialized on path /ws');

  wss.on('connection', (ws: WebSocket & { isAlive?: boolean }, req) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const text = data.toString();
        const parsed = JSON.parse(text);
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore unparseable client messages
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client error:', err.message);
    });

    // Send welcome confirmation
    try {
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to Attendance WebSocket server',
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[WebSocket] Failed to send welcome message', e);
    }
  });

  // Heartbeat every 30s to detect disconnected clients
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      if (!wss) return;
      wss.clients.forEach((client: WebSocket & { isAlive?: boolean }) => {
        if (client.isAlive === false) {
          return client.terminate();
        }
        client.isAlive = false;
        try {
          client.ping();
        } catch {
          client.terminate();
        }
      });
    }, 30000);
  }

  wss.on('close', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    wss = null;
  });

  return wss;
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wss;
};

export const broadcastAttendance = (event: AttendanceWebSocketEvent): void => {
  if (!wss) {
    return;
  }

  const payload = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  let activeCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
        activeCount++;
      } catch (err) {
        console.warn('[WebSocket] Broadcast error to client:', err);
      }
    }
  });

  console.log(`[WebSocket] Broadcasted event "${event.type}" to ${activeCount} client(s)`);
};
