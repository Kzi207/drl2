import { useEffect, useState, useRef } from 'react';

export interface AttendanceEvent {
  type: 'ATTENDANCE_CHECKED_IN' | 'ATTENDANCE_REMOVED' | 'DAILY_ATTENDANCE_UPDATED' | 'CONNECTED';
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

type EventListener = (event: AttendanceEvent) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<EventListener>();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private reconnectAttempts = 0;
  private isManuallyClosed = false;
  private statusListeners = new Set<(connected: boolean) => void>();

  constructor() {
    this.connect();
  }

  private getUrl(): string {
    const customUrl = (import.meta as any).env?.VITE_WS_URL;
    if (customUrl) return customUrl;

    const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api';
    if (apiUrl.startsWith('http')) {
      const wsProto = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
      const parsed = new URL(apiUrl);
      return `${wsProto}//${parsed.host}/ws`;
    }

    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/ws`;
    }

    return 'ws://localhost:5000/ws';
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isManuallyClosed = false;
    const url = this.getUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus(true);

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (messageEvent) => {
        try {
          const data = JSON.parse(messageEvent.data);
          if (data.type === 'pong') return;
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('[WebSocket] Listener error:', err);
            }
          });
        } catch {
          // Ignore unparseable frames
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        if (!this.isManuallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
      };
    } catch (err) {
      console.warn('[WebSocket] Init failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected);
      } catch (e) {
        console.error('[WebSocket] Status listener error:', e);
      }
    });
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStatus(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public close(): void {
    this.isManuallyClosed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
  }
}

// Singleton WebSocket client
let clientInstance: WebSocketClient | null = null;

export const getWebSocketClient = (): WebSocketClient => {
  if (!clientInstance) {
    clientInstance = new WebSocketClient();
  }
  return clientInstance;
};

export const subscribeAttendanceEvents = (listener: EventListener): (() => void) => {
  return getWebSocketClient().subscribe(listener);
};

export const useAttendanceWebSocket = (onEvent?: EventListener) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AttendanceEvent | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const client = getWebSocketClient();
    const unsubStatus = client.subscribeStatus((connected) => {
      setIsConnected(connected);
    });

    const unsubEvent = client.subscribe((event) => {
      setLastEvent(event);
      if (onEventRef.current) {
        onEventRef.current(event);
      }
    });

    return () => {
      unsubStatus();
      unsubEvent();
    };
  }, []);

  return { isConnected, lastEvent };
};
