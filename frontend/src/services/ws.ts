import { SystemMetrics } from '../types';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Array<(metrics: SystemMetrics) => void> = [];
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/metrics`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'metrics' && parsed.data) {
            for (const listener of this.listeners) {
              listener(parsed.data);
            }
          }
        } catch {
          // Ignore invalid JSON
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  public subscribe(callback: (metrics: SystemMetrics) => void): () => void {
    this.listeners.push(callback);
    this.connect();

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      if (this.listeners.length === 0 && this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }
}

export const wsClient = new WebSocketClient();
