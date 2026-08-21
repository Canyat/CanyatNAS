import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbService } from './db.service';
import { ProcessInfo } from '../types';

interface RunningProcess {
  process: ChildProcess;
  startedAt: number;
  logs: string[];
  crashCount: number;
}

export class ProcessService {
  private runningProcesses: Map<string, RunningProcess> = new Map();
  private maxLogLines = 500;

  constructor() {
    // Delay autostart slightly to ensure DB is initialized
    setTimeout(() => {
      this.initAutoStart();
    }, 2000);
  }

  private async initAutoStart(): Promise<void> {
    try {
      const list = await dbService.listProcesses();
      for (const p of list) {
        if (p.autoStart) {
          console.log(`[ProcessService] Auto-starting custom process: ${p.name} (${p.id})`);
          this.startProcess(p.id).catch((err) => {
            console.error(`[ProcessService] Failed to auto-start ${p.name}:`, err.message);
          });
        }
      }
    } catch (err) {
      console.error('[ProcessService] Error in initAutoStart:', err);
    }
  }

  // List all processes merged with live runtime status
  public async listProcesses(): Promise<ProcessInfo[]> {
    const list = await dbService.listProcesses();
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
  public async getProcess(id: string): Promise<ProcessInfo | null> {
    const p = await dbService.getProcess(id);
    if (!p) return null;
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
  public async createProcess(data: Omit<ProcessInfo, 'status' | 'uptime' | 'pid' | 'createdAt'>): Promise<ProcessInfo> {
    const id = data.id || 'proc_' + Date.now();
    const newProc: ProcessInfo = {
      ...data,
      id,
      status: 'stopped',
      createdAt: Date.now(),
      autoStart: Boolean(data.autoStart),
      autoRestart: Boolean(data.autoRestart)
    };
    await dbService.createProcess(newProc);

    if (newProc.autoStart) {
      this.startProcess(id).catch(() => {});
    }

    return newProc;
  }

  // Update process config
  public async updateProcess(id: string, updates: Partial<ProcessInfo>): Promise<boolean> {
    const success = await dbService.updateProcess(id, updates);
    return success;
  }

  // Start process
  public async startProcess(id: string): Promise<boolean> {
    const procData = await dbService.getProcess(id);
    if (!procData) throw new Error('Process not found');

    // If already running, return true
    if (this.runningProcesses.has(id)) {
      const existing = this.runningProcesses.get(id)!;
      if (existing.process && !existing.process.killed) {
        return true;
      }
    }

    const command = procData.command.trim();
    if (!command) throw new Error('Command cannot be empty');

    let workingDir = procData.cwd ? path.resolve(procData.cwd) : process.cwd();
    if (!fs.existsSync(workingDir)) {
      workingDir = process.cwd();
    }

    const env = {
      ...process.env,
      ...(procData.env || {})
    };

    const fullCmd = procData.args ? `${command} ${procData.args}` : command;

    const appendLog = (line: string) => {
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
    const child = spawn(fullCmd, [], {
      shell: isWin ? 'cmd.exe' : '/bin/sh',
      cwd: workingDir,
      env,
      windowsHide: true
    });

    const runtimeObj: RunningProcess = {
      process: child,
      startedAt: Date.now(),
      logs: [`[${timestamp()}] [System] 🚀 Process started: ${fullCmd}`],
      crashCount: this.runningProcesses.get(id)?.crashCount || 0
    };

    this.runningProcesses.set(id, runtimeObj);
    await dbService.updateProcess(id, { status: 'running' });

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const l of lines) {
        appendLog(`[${timestamp()}] ${l}`);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf8');
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const l of lines) {
        appendLog(`[${timestamp()}] [ERR] ${l}`);
      }
    });

    child.on('error', (err) => {
      appendLog(`[${timestamp()}] [System Error] ${err.message}`);
      dbService.updateProcess(id, { status: 'errored' });
    });

    child.on('close', (code, signal) => {
      appendLog(`[${timestamp()}] [System] Process exited with code ${code} (signal: ${signal})`);
      this.runningProcesses.delete(id);

      const isNormalExit = code === 0;
      dbService.updateProcess(id, {
        status: isNormalExit ? 'stopped' : 'errored'
      });

      // Auto restart if configured and unexpected exit
      if (procData.autoRestart && !isNormalExit) {
        runtimeObj.crashCount += 1;
        const delay = Math.min(runtimeObj.crashCount * 2000, 10000);
        appendLog(`[${timestamp()}] [System] ⏳ Crash detected. Auto-restarting in ${delay / 1000}s (attempt ${runtimeObj.crashCount})...`);
        setTimeout(() => {
          this.startProcess(id).catch(() => {});
        }, delay);
      }
    });

    return true;
  }

  // Stop process
  public async stopProcess(id: string): Promise<boolean> {
    const runtime = this.runningProcesses.get(id);
    if (!runtime || !runtime.process) {
      await dbService.updateProcess(id, { status: 'stopped' });
      return true;
    }

    const pid = runtime.process.pid;
    if (pid) {
      if (process.platform === 'win32') {
        // Use taskkill on Windows to kill tree
        try {
          spawn('taskkill', ['/pid', pid.toString(), '/T', '/F']);
        } catch {}
      } else {
        runtime.process.kill('SIGTERM');
        setTimeout(() => {
          if (this.runningProcesses.has(id)) {
            try { runtime.process.kill('SIGKILL'); } catch {}
          }
        }, 3000);
      }
    }

    this.runningProcesses.delete(id);
    await dbService.updateProcess(id, { status: 'stopped' });
    return true;
  }

  // Restart process
  public async restartProcess(id: string): Promise<boolean> {
    await this.stopProcess(id);
    await new Promise(r => setTimeout(r, 600));
    return await this.startProcess(id);
  }

  // Delete process config
  public async deleteProcess(id: string): Promise<boolean> {
    await this.stopProcess(id);
    return await dbService.deleteProcess(id);
  }

  // Get process console logs
  public getProcessLogs(id: string): string[] {
    const runtime = this.runningProcesses.get(id);
    if (runtime) {
      return [...runtime.logs];
    }
    return [`[System] Process is not currently active.`];
  }

  // Clean all on server shutdown
  public stopAll(): void {
    for (const [id, runtime] of this.runningProcesses.entries()) {
      try {
        if (runtime.process && runtime.process.pid) {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', runtime.process.pid.toString(), '/T', '/F']);
          } else {
            runtime.process.kill('SIGTERM');
          }
        }
      } catch {}
    }
    this.runningProcesses.clear();
  }
}

export const processService = new ProcessService();
