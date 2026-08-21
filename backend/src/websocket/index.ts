import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { systemService } from '../services/system.service';
import { dockerService } from '../services/docker.service';

export function setupWebSockets(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Metrics broadcaster timer
  const metricsClients = new Set<WebSocket>();

  setInterval(async () => {
    if (metricsClients.size === 0) return;

    try {
      const metrics = await systemService.collectMetrics();
      const payload = JSON.stringify({ type: 'metrics', data: metrics });

      for (const client of metricsClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    } catch {
      // Ignore broadcast errors
    }
  }, 1500);

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url || '').pathname || '';

    if (
      pathname === '/ws/metrics' ||
      pathname.startsWith('/ws/docker/logs/') ||
      pathname.startsWith('/ws/docker/terminal/')
    ) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const pathname = url.parse(req.url || '').pathname || '';

    if (pathname === '/ws/metrics') {
      metricsClients.add(ws);
      // Immediately send current metrics
      systemService.collectMetrics().then((metrics) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
        }
      }).catch(() => {});

      ws.on('close', () => {
        metricsClients.delete(ws);
      });
    } else if (pathname.startsWith('/ws/docker/logs/')) {
      const containerId = pathname.replace('/ws/docker/logs/', '');
      dockerService.streamContainerLogs(containerId, ws).catch(() => {});
    } else if (pathname.startsWith('/ws/docker/terminal/')) {
      const containerId = pathname.replace('/ws/docker/terminal/', '');
      dockerService.execContainerShell(containerId, ws).catch(() => {});
    }
  });

  return wss;
}
