"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSockets = setupWebSockets;
const ws_1 = require("ws");
const url_1 = __importDefault(require("url"));
const system_service_1 = require("../services/system.service");
const docker_service_1 = require("../services/docker.service");
function setupWebSockets(server) {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    // Metrics broadcaster timer
    const metricsClients = new Set();
    setInterval(async () => {
        if (metricsClients.size === 0)
            return;
        try {
            const metrics = await system_service_1.systemService.collectMetrics();
            const payload = JSON.stringify({ type: 'metrics', data: metrics });
            for (const client of metricsClients) {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(payload);
                }
            }
        }
        catch {
            // Ignore broadcast errors
        }
    }, 1500);
    server.on('upgrade', (request, socket, head) => {
        const pathname = url_1.default.parse(request.url || '').pathname || '';
        if (pathname === '/ws/metrics' ||
            pathname.startsWith('/ws/docker/logs/') ||
            pathname.startsWith('/ws/docker/terminal/')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        }
        else {
            socket.destroy();
        }
    });
    wss.on('connection', (ws, req) => {
        const pathname = url_1.default.parse(req.url || '').pathname || '';
        if (pathname === '/ws/metrics') {
            metricsClients.add(ws);
            // Immediately send current metrics
            system_service_1.systemService.collectMetrics().then((metrics) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
                }
            }).catch(() => { });
            ws.on('close', () => {
                metricsClients.delete(ws);
            });
        }
        else if (pathname.startsWith('/ws/docker/logs/')) {
            const containerId = pathname.replace('/ws/docker/logs/', '');
            docker_service_1.dockerService.streamContainerLogs(containerId, ws).catch(() => { });
        }
        else if (pathname.startsWith('/ws/docker/terminal/')) {
            const containerId = pathname.replace('/ws/docker/terminal/', '');
            docker_service_1.dockerService.execContainerShell(containerId, ws).catch(() => { });
        }
    });
    return wss;
}
