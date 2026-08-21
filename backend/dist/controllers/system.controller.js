"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemController = exports.SystemController = void 0;
const system_service_1 = require("../services/system.service");
class SystemController {
    async getMetrics(req, res) {
        try {
            const metrics = await system_service_1.systemService.collectMetrics();
            res.json(metrics);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async reboot(req, res) {
        try {
            const result = await system_service_1.systemService.rebootHost();
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async shutdown(req, res) {
        try {
            const result = await system_service_1.systemService.shutdownHost();
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.SystemController = SystemController;
exports.systemController = new SystemController();
