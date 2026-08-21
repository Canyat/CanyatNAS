import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbService } from '../services/db.service';
import { generateToken, AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const user = await dbService.getUser(username);
      if (!user) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      const isValid = bcrypt.compareSync(password, user.password_hash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      const token = generateToken({ username: user.username });
      res.json({
        token,
        user: {
          username: user.username,
          createdAt: user.created_at
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async getMe(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await dbService.getUser(req.user.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      username: user.username,
      createdAt: user.created_at
    });
  }

  public async changePassword(req: AuthRequest, res: Response): Promise<void> {
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

      const user = await dbService.getUser(username);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isValid = bcrypt.compareSync(oldPassword, user.password_hash);
      if (!isValid) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      await dbService.setUserPassword(username, newHash);

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async changeUsername(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { newUsername, password } = req.body;
      const currentUsername = req.user?.username;

      if (!currentUsername) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      if (!newUsername || newUsername.trim().length < 2) {
        res.status(400).json({ error: 'New username must be at least 2 characters' });
        return;
      }

      const trimmedNewUser = newUsername.trim();

      // Check current password
      const user = await dbService.getUser(currentUsername);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (password) {
        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) {
          res.status(400).json({ error: 'Password is incorrect' });
          return;
        }
      }

      // Check if new username already taken
      if (trimmedNewUser !== currentUsername) {
        const existing = await dbService.getUser(trimmedNewUser);
        if (existing) {
          res.status(400).json({ error: 'Username is already in use' });
          return;
        }
      }

      await dbService.setUsername(currentUsername, trimmedNewUser);
      const newToken = generateToken({ username: trimmedNewUser });

      res.json({
        success: true,
        token: newToken,
        user: { username: trimmedNewUser }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

export const authController = new AuthController();
