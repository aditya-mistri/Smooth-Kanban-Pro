import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";
import { SOCKET_EVENTS, NOTIFICATION_TYPES } from "../socket/events.js";

export default function (socketManager, socketEventHelper) {
  const router = express.Router();
  const SALT_ROUNDS = 10;

  // Signup
  router.post("/signup", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ error: "All fields required" });

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      const existing = await User.findOne({ where: { email } });
      if (existing)
        return res.status(400).json({ error: "Email already in use" });

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await User.create({
        name,
        email,
        password_hash: hashed,
        role: role || "member",
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Send welcome notification after successful signup
      setTimeout(() => {
        socketEventHelper.emitNotification(user.id, {
          type: NOTIFICATION_TYPES.SUCCESS,
          title: 'Welcome!',
          message: `Welcome to the platform, ${name}! Your account has been created successfully.`,
          data: { userId: user.id }
        });
      }, 1000);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Login
  router.post("/login", async (req, res) => {
    try {
      console.log("🔹 Login attempt for email:", req.body.email);
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email & password required" });

      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Send login notification
      setTimeout(() => {
        socketEventHelper.emitNotification(user.id, {
          type: NOTIFICATION_TYPES.INFO,
          title: 'Welcome Back!',
          message: `Hi ${user.name}, you have successfully logged in.`,
          data: { loginTime: new Date() }
        });
      }, 1000);

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user profile
  router.get('/profile', authenticate, async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'role', 'createdAt']
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Add online status
      const userWithStatus = {
        ...user.toJSON(),
        isOnline: socketManager.isUserOnline(user.id),
        lastActive: new Date() // You can implement actual last activity tracking
      };

      res.json(userWithStatus);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update user profile
  router.put('/profile', authenticate, async (req, res) => {
    try {
      const { name, email } = req.body;
      const user = await User.findByPk(req.user.id);
      
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          where: { email },
          attributes: ['id'] 
        });
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      const updatedData = {};
      if (name && name !== user.name) updatedData.name = name;
      if (email && email !== user.email) updatedData.email = email;

      if (Object.keys(updatedData).length === 0) {
        return res.status(400).json({ error: 'No changes to update' });
      }

      await user.update(updatedData);

      // Send profile update notification
      socketEventHelper.emitNotification(user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully',
        data: { updatedFields: Object.keys(updatedData) }
      });

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      });
    } catch (err) {
      console.error(err);
      
      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: 'Profile Update Failed',
        message: 'Failed to update profile. Please try again.'
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Change password
  router.put('/password', authenticate, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Verify current password
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password and update
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await user.update({ password_hash: hashedNewPassword });

      // Send password change notification
      socketEventHelper.emitNotification(user.id, {
        type: NOTIFICATION_TYPES.SUCCESS,
        title: 'Password Changed',
        message: 'Your password has been changed successfully',
        data: { changedAt: new Date() }
      });

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error(err);
      
      // Send error notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.ERROR,
        title: 'Password Change Failed',
        message: 'Failed to change password. Please try again.'
      });
      
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout (mainly for notification purposes)
  router.post('/logout', authenticate, async (req, res) => {
    try {
      // Send logout notification
      socketEventHelper.emitNotification(req.user.id, {
        type: NOTIFICATION_TYPES.INFO,
        title: 'Logged Out',
        message: 'You have been logged out successfully',
        data: { logoutTime: new Date() }
      });

      // Note: Since we're using JWTs, actual logout is handled client-side
      // by removing the token. This endpoint is mainly for cleanup/notifications.
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}