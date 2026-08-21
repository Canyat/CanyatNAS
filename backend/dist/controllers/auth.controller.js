"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_service_1 = require("../services/db.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
class AuthController {
    async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                res.status(400).json({ error: 'Username and password are required' });
                return;
            }
            const user = await db_service_1.dbService.getUser(username);
            if (!user) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }
            const isValid = bcryptjs_1.default.compareSync(password, user.password_hash);
            if (!isValid) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }
            const token = (0, auth_middleware_1.generateToken)({ username: user.username });
            res.json({
                token,
                user: {
                    username: user.username,
                    createdAt: user.created_at
                }
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async getMe(req, res) {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const user = await db_service_1.dbService.getUser(req.user.username);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            username: user.username,
            createdAt: user.created_at
        });
    }
    async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            const username = req.user?.username;
            if (!username) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }
            if (!newPassword || newPassword.length < 6) {
                res.status(400).json({ error: 'New password must be at least 6 characters' });
                return;
            }
            const user = await db_service_1.dbService.getUser(username);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const isValid = bcryptjs_1.default.compareSync(oldPassword, user.password_hash);
            if (!isValid) {
                res.status(400).json({ error: 'Current password is incorrect' });
                return;
            }
            const newHash = bcryptjs_1.default.hashSync(newPassword, 10);
            await db_service_1.dbService.setUserPassword(username, newHash);
            res.json({ success: true, message: 'Password updated successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
