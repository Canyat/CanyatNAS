import { Request, Response } from 'express';
import { dockerService } from '../services/docker.service';

export class DockerController {
  public async getStatus(req: Request, res: Response): Promise<void> {
    res.json(dockerService.getStatus());
  }

  public async listContainers(req: Request, res: Response): Promise<void> {
    try {
      const containers = await dockerService.listContainers();
      res.json(containers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async startContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dockerService.startContainer(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async stopContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dockerService.stopContainer(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async restartContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dockerService.restartContainer(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async pauseContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dockerService.pauseContainer(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async unpauseContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const success = await dockerService.unpauseContainer(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async removeContainer(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const force = req.query.force === 'true';
      const success = await dockerService.removeContainer(id, force);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getContainerLogs(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const tail = req.query.tail ? parseInt(req.query.tail as string, 10) : 200;
      const logs = await dockerService.getContainerLogs(id, tail);
      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async listImages(req: Request, res: Response): Promise<void> {
    try {
      const images = await dockerService.listImages();
      res.json(images);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async pullImage(req: Request, res: Response): Promise<void> {
    try {
      const { image } = req.body;
      if (!image) {
        res.status(400).json({ error: 'Image name is required' });
        return;
      }
      await dockerService.pullImage(image);
      res.json({ success: true, message: `Image ${image} pulled successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async removeImage(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const force = req.query.force === 'true';
      const success = await dockerService.removeImage(id, force);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getTemplates(req: Request, res: Response): Promise<void> {
    res.json(dockerService.getAppTemplates());
  }

  public async deployApp(req: Request, res: Response): Promise<void> {
    try {
      const result = await dockerService.deployApp(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const dockerController = new DockerController();
