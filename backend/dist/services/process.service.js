"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processService = exports.ProcessService = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_service_1 = require("./db.service");
class ProcessService {
    runningProcesses = new Map();
    maxLogLines = 500;
    constructor() {
        // Delay autostart slightly to ensure DB is initialized
        setTimeout(() => {
            this.initAutoStart();
        }, 2000);
    }
    async initAutoStart() {
        try {
            const list = await db_service_1.dbService.listProcesses();
            for (const p of list) {
                if (p.autoStart) {
                    console.log(`[ProcessService] Auto-starting custom process: ${p.name} (${p.id})`);
                    this.startProcess(p.id).catch((err) => {
                        console.error(`[ProcessService] Failed to auto-start ${p.name}:`, err.message);
                    });
                }
            }
        }
        catch (err) {
            console.error('[ProcessService] Error in initAutoStart:', err);
        }
    }
    // List all processes merged with live runtime status
    async listProcesses() {
        const list = await db_service_1.dbService.listProcesses();
        return list.map(p => {
            const running = this.runningProcesses.get(p.id);
            if (running && running.process && running.process.pid && !running.process.killed) {
                const uptime = Math.floor((Date.now() - running.startedAt) / 1000);
                return {
                    ...p,
                    status: 'running',
                    pid: running.process.pid,
                    uptime
                };
            }
            return {
                ...p,
                status: p.status === 'running' ? 'stopped' : p.status,
                pid: undefined,
                uptime: 0
            };
        });
    }
    // Get single process info
    async getProcess(id) {
        const p = await db_service_1.dbService.getProcess(id);
        if (!p)
            return null;
        const running = this.runningProcesses.get(p.id);
        if (running && running.process && running.process.pid && !running.process.killed) {
            const uptime = Math.floor((Date.now() - running.startedAt) / 1000);
            return {
                ...p,
                status: 'running',
                pid: running.process.pid,
                uptime
            };
        }
        return p;
    }
    // Create new custom process entry
    async createProcess(data) {
        const id = data.id || 'proc_' + Date.now();
        const newProc = {
            ...data,
            id,
            status: 'stopped',
            createdAt: Date.now(),
            autoStart: Boolean(data.autoStart),
            autoRestart: Boolean(data.autoRestart)
        };
        await db_service_1.dbService.createProcess(newProc);
        if (newProc.autoStart) {
            this.startProcess(id).catch(() => { });
        }
        return newProc;
    }
    // Update process config
    async updateProcess(id, updates) {
        const success = await db_service_1.dbService.updateProcess(id, updates);
        return success;
    }
    // Start process
    async startProcess(id) {
        const procData = await db_service_1.dbService.getProcess(id);
        if (!procData)
            throw new Error('Process not found');
        // If already running, return true
        if (this.runningProcesses.has(id)) {
            const existing = this.runningProcesses.get(id);
            if (existing.process && !existing.process.killed) {
                return true;
            }
        }
        const command = procData.command.trim();
        if (!command)
            throw new Error('Command cannot be empty');
        let workingDir = procData.cwd ? path_1.default.resolve(procData.cwd) : process.cwd();
        if (!fs_1.default.existsSync(workingDir)) {
            workingDir = process.cwd();
        }
        const env = {
            ...process.env,
            ...(procData.env || {})
        };
        const fullCmd = procData.args ? `${command} ${procData.args}` : command;
        const appendLog = (line) => {
            const runtime = this.runningProcesses.get(id);
            if (runtime) {
                runtime.logs.push(line);
                if (runtime.logs.length > this.maxLogLines) {
                    runtime.logs.shift();
                }
            }
        };
        const timestamp = () => new Date().toLocaleTimeString();
        // Spawn child process with cross-platform shell
        const isWin = process.platform === 'win32';
        const child = (0, child_process_1.spawn)(fullCmd, [], {
            shell: isWin ? 'cmd.exe' : '/bin/sh',
            cwd: workingDir,
            env,
            windowsHide: true
        });
        const runtimeObj = {
            process: child,
            startedAt: Date.now(),
            logs: [`[${timestamp()}] [System] 🚀 Process started: ${fullCmd}`],
            crashCount: this.runningProcesses.get(id)?.crashCount || 0
        };
        this.runningProcesses.set(id, runtimeObj);
        await db_service_1.dbService.updateProcess(id, { status: 'running' });
        child.stdout?.on('data', (data) => {
            const text = data.toString('utf8');
            const lines = text.split(/\r?\n/).filter(Boolean);
            for (const l of lines) {
                appendLog(`[${timestamp()}] ${l}`);
            }
        });
        child.stderr?.on('data', (data) => {
            const text = data.toString('utf8');
            const lines = text.split(/\r?\n/).filter(Boolean);
            for (const l of lines) {
                appendLog(`[${timestamp()}] [ERR] ${l}`);
            }
        });
        child.on('error', (err) => {
            appendLog(`[${timestamp()}] [System Error] ${err.message}`);
            db_service_1.dbService.updateProcess(id, { status: 'errored' });
        });
        child.on('close', (code, signal) => {
            appendLog(`[${timestamp()}] [System] Process exited with code ${code} (signal: ${signal})`);
            this.runningProcesses.delete(id);
            const isNormalExit = code === 0;
            db_service_1.dbService.updateProcess(id, {
                status: isNormalExit ? 'stopped' : 'errored'
            });
            // Auto restart if configured and unexpected exit
            if (procData.autoRestart && !isNormalExit) {
                runtimeObj.crashCount += 1;
                const delay = Math.min(runtimeObj.crashCount * 2000, 10000);
                appendLog(`[${timestamp()}] [System] ⏳ Crash detected. Auto-restarting in ${delay / 1000}s (attempt ${runtimeObj.crashCount})...`);
                setTimeout(() => {
                    this.startProcess(id).catch(() => { });
                }, delay);
            }
        });
        return true;
    }
    // Stop process
    async stopProcess(id) {
        const runtime = this.runningProcesses.get(id);
        if (!runtime || !runtime.process) {
            await db_service_1.dbService.updateProcess(id, { status: 'stopped' });
            return true;
        }
        const pid = runtime.process.pid;
        if (pid) {
            if (process.platform === 'win32') {
                // Use taskkill on Windows to kill tree
                try {
                    (0, child_process_1.spawn)('taskkill', ['/pid', pid.toString(), '/T', '/F']);
                }
                catch { }
            }
            else {
                runtime.process.kill('SIGTERM');
                setTimeout(() => {
                    if (this.runningProcesses.has(id)) {
                        try {
                            runtime.process.kill('SIGKILL');
                        }
                        catch { }
                    }
                }, 3000);
            }
        }
        this.runningProcesses.delete(id);
        await db_service_1.dbService.updateProcess(id, { status: 'stopped' });
        return true;
    }
    // Restart process
    async restartProcess(id) {
        await this.stopProcess(id);
        await new Promise(r => setTimeout(r, 600));
        return await this.startProcess(id);
    }
    // Delete process config
    async deleteProcess(id) {
        await this.stopProcess(id);
        return await db_service_1.dbService.deleteProcess(id);
    }
    // Get process console logs
    getProcessLogs(id) {
        const runtime = this.runningProcesses.get(id);
        if (runtime) {
            return [...runtime.logs];
        }
        return [`[System] Process is not currently active.`];
    }
    // Clean all on server shutdown
    stopAll() {
        for (const [id, runtime] of this.runningProcesses.entries()) {
            try {
                if (runtime.process && runtime.process.pid) {
                    if (process.platform === 'win32') {
                        (0, child_process_1.spawn)('taskkill', ['/pid', runtime.process.pid.toString(), '/T', '/F']);
                    }
                    else {
                        runtime.process.kill('SIGTERM');
                    }
                }
            }
            catch { }
        }
        this.runningProcesses.clear();
    }
}
exports.ProcessService = ProcessService;
exports.processService = new ProcessService();
