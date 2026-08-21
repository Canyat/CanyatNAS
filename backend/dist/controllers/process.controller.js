"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processController = exports.ProcessController = void 0;
const process_service_1 = require("../services/process.service");
class ProcessController {
    // List all custom processes
    async list(req, res) {
        try {
            const processes = await process_service_1.processService.listProcesses();
            res.json({ processes });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Create custom process
    async create(req, res) {
        try {
            const { name, command, args, cwd, env, autoStart, autoRestart, icon } = req.body;
            if (!name || !command) {
                res.status(400).json({ error: 'Name and Command are required' });
                return;
            }
            const proc = await process_service_1.processService.createProcess({
                id: 'proc_' + Date.now(),
                name,
                command,
                args: args || '',
                cwd: cwd || '',
                env: env || {},
                autoStart: Boolean(autoStart),
                autoRestart: Boolean(autoRestart),
                icon: icon || ''
            });
            res.json({ success: true, process: proc });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Start process
    async start(req, res) {
        try {
            const id = req.params.id;
            await process_service_1.processService.startProcess(id);
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Stop process
    async stop(req, res) {
        try {
            const id = req.params.id;
            await process_service_1.processService.stopProcess(id);
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Restart process
    async restart(req, res) {
        try {
            const id = req.params.id;
            await process_service_1.processService.restartProcess(id);
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Delete process
    async delete(req, res) {
        try {
            const id = req.params.id;
            await process_service_1.processService.deleteProcess(id);
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // Get process console output logs
    async getLogs(req, res) {
        try {
            const id = req.params.id;
            const logs = process_service_1.processService.getProcessLogs(id);
            res.json({ logs });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.ProcessController = ProcessController;
exports.processController = new ProcessController();
