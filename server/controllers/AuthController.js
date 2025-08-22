import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import DatabaseService from '../services/DatabaseService.js';

class AuthController {
  constructor() {
    this.databaseService = new DatabaseService();
    // Don't cache JWT_SECRET - read it fresh each time
  }

  getJwtSecret() {
    return process.env.JWT_SECRET || 'your-secret-key';
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username and password are required'
        });
      }

      // Find user by email
      const user = await this.databaseService.findUserByEmail(username);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Create JWT token with real user ID
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.email, 
          role: 'admin' 
        },
        this.getJwtSecret(),
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.email,
          email: user.email,
          role: 'admin'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }

  async register(req, res) {
    try {
      const { username, email, password, role = 'viewer' } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username, email, and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await this.userService.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await this.userService.createUser({
        username,
        email,
        passwordHash,
        role
      });

      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        this.getJwtSecret(),
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await this.databaseService.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.email,
          email: user.email,
          role: 'admin' // TODO: Get actual role from database
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch profile'
      });
    }
  }

  async googleSSO(req, res) {
    // Placeholder for Google SSO implementation
    res.status(501).json({
      success: false,
      error: 'Google SSO not implemented yet'
    });
  }

  async azureSSO(req, res) {
    // Placeholder for Azure SSO implementation
    res.status(501).json({
      success: false,
      error: 'Azure SSO not implemented yet'
    });
  }

  async getRoles(req, res) {
    try {
      const roles = ['admin', 'developer', 'viewer'];
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch roles'
      });
    }
  }
}

export default AuthController;