import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import DatabaseService from '../services/DatabaseService.js';

class AuthController {
  constructor() {
    this.databaseService = new DatabaseService();
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
        // Use actual user from database if available, fallback to mock
        let user = await this.databaseService.findUserByEmail(username);
        
        if (!user) {
          // Create a mock user response for development
          const token = jwt.sign(
            { 
              userId: 'dev-user', 
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
              id: 'dev-user',
              username: username,
              email: username.includes('@') ? username : `${username}@example.com`,
              role: 'admin'
            }
          });
        }

        // Check password for real user
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          // In development, fall back to mock user for invalid credentials
          const token = jwt.sign(
            { 
              userId: 'dev-user', 
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
              id: 'dev-user',
              username: username,
              email: username.includes('@') ? username : `${username}@example.com`,
              role: 'admin'
            }
          });
        }

        // Use real user from database
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.email, 
            role: 'admin' 
          },
          this.jwtSecret || 'dev-secret',
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
      }

      // PRODUCTION MODE: Actual authentication
      const user = await this.databaseService.findUserByEmail(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.email, 
          role: 'admin' 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
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
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Handle development mode mock user
      if (userId === 'dev-user') {
        return res.json({
          success: true,
          user: {
            id: 'dev-user',
            username: req.user.username,
            email: req.user.username.includes('@') ? req.user.username : `${req.user.username}@example.com`,
            role: 'admin'
          }
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