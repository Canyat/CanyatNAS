import { Request, Response } from 'express';
import { processService } from '../services/process.service';

export class ProcessController {
  // List all custom processes
  public async list(req: Request, res: Response): Promise<void> {
    try {
      const processes = await processService.listProcesses();
      res.json({ processes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Create custom process
  public async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, command, args, cwd, env, autoStart, autoRestart, icon } = req.body;
      if (!name || !command) {
        res.status(400).json({ error: 'Name and Command are required' });
        return;
      }
      const proc = await processService.createProcess({
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Start process
  public async start(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await processService.startProcess(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Stop process
  public async stop(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await processService.stopProcess(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Restart process
  public async restart(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await processService.restartProcess(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Delete process
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      await processService.deleteProcess(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // Get process console output logs
  public async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const logs = processService.getProcessLogs(id);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const processController = new ProcessController();
