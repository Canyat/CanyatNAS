"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dockerController = exports.DockerController = void 0;
const docker_service_1 = require("../services/docker.service");
class DockerController {
    async getStatus(req, res) {
        res.json(docker_service_1.dockerService.getStatus());
    }
    async listContainers(req, res) {
        try {
            const containers = await docker_service_1.dockerService.listContainers();
            res.json(containers);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async startContainer(req, res) {
        try {
            const id = req.params.id;
            const success = await docker_service_1.dockerService.startContainer(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async stopContainer(req, res) {
        try {
            const id = req.params.id;
            const success = await docker_service_1.dockerService.stopContainer(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async restartContainer(req, res) {
        try {
            const id = req.params.id;
            const success = await docker_service_1.dockerService.restartContainer(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async pauseContainer(req, res) {
        try {
            const id = req.params.id;
            const success = await docker_service_1.dockerService.pauseContainer(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async unpauseContainer(req, res) {
        try {
            const id = req.params.id;
            const success = await docker_service_1.dockerService.unpauseContainer(id);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async removeContainer(req, res) {
        try {
            const id = req.params.id;
            const force = req.query.force === 'true';
            const success = await docker_service_1.dockerService.removeContainer(id, force);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async getContainerLogs(req, res) {
        try {
            const id = req.params.id;
            const tail = req.query.tail ? parseInt(req.query.tail, 10) : 200;
            const logs = await docker_service_1.dockerService.getContainerLogs(id, tail);
            res.json({ logs });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async listImages(req, res) {
        try {
            const images = await docker_service_1.dockerService.listImages();
            res.json(images);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async pullImage(req, res) {
        try {
            const { image } = req.body;
            if (!image) {
                res.status(400).json({ error: 'Image name is required' });
                return;
            }
            await docker_service_1.dockerService.pullImage(image);
            res.json({ success: true, message: `Image ${image} pulled successfully` });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async removeImage(req, res) {
        try {
            const id = req.params.id;
            const force = req.query.force === 'true';
            const success = await docker_service_1.dockerService.removeImage(id, force);
            res.json({ success });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async getTemplates(req, res) {
        res.json(docker_service_1.dockerService.getAppTemplates());
    }
    async deployApp(req, res) {
        try {
            const result = await docker_service_1.dockerService.deployApp(req.body);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.DockerController = DockerController;
exports.dockerController = new DockerController();
