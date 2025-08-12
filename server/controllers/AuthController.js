import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserService from '../services/UserService.js';

class AuthController {
  constructor() {
    this.userService = new UserService();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
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

      // DEVELOPMENT MODE: Accept any credentials for testing
      if (process.env.NODE_ENV !== 'production') {
        const token = jwt.sign(
          { 
            userId: 1, 
            username: username, 
            role: 'admin' 
          },
          this.jwtSecret || 'dev-secret',
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          token,
          user: {
            id: 1,
            username: username,
            email: `${username}@example.com`,
            role: 'admin'
          }
        });
      }

      // PRODUCTION MODE: Actual authentication
      const user = await this.userService.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
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
        this.jwtSecret,
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
      // DEVELOPMENT MODE: Return a mock profile when no auth middleware
      if (process.env.NODE_ENV !== 'production' && !req.user) {
        return res.json({
          success: true,
          user: {
            id: 1,
            username: 'testuser',
            email: 'testuser@example.com',
            role: 'admin'
          }
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await this.userService.findById(userId);
      
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
          username: user.username,
          email: user.email,
          role: user.role
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