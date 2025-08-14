import bcrypt from 'bcryptjs';
import DatabaseService from './DatabaseService.js';

class UserService {
  constructor() {
    this.db = new DatabaseService();
  }

  getAllUsers() {
    try {
      const users = this.db.getAllUsers();
      
      // Remove password_hash from response
      return users.map(user => {
        const { password_hash, ...userResponse } = user;
        return userResponse;
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = this.db.findUserByEmail(userData.email);
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash the password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);

      const newUserData = {
        email: userData.email,
        password_hash,
        name: userData.firstName && userData.lastName ? 
          `${userData.firstName} ${userData.lastName}` : 
          userData.name || userData.username || userData.email.split('@')[0],
        is_active: userData.isActive !== undefined ? (userData.isActive ? 1 : 0) : 1
      };

      const user = this.db.createUser(newUserData);
      
      // Return user without password
      const { password_hash: _, ...userResponse } = user;
      return userResponse;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  findByUsername(username) {
    try {
      // For backwards compatibility, treat username as email
      return this.db.findUserByEmail(username);
    } catch (error) {
      console.error('Error finding user by username:', error);
      return null;
    }
  }

  findByEmail(email) {
    try {
      return this.db.findUserByEmail(email);
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  findById(id) {
    try {
      return this.db.findUserById(id);
    } catch (error) {
      console.error('Error finding user by id:', error);
      return null;
    }
  }

  async validatePassword(username, password) {
    try {
      const user = this.findByUsername(username);
      if (!user) {
        return false;
      }

      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  }

  async updateUser(id, userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        const saltRounds = 12;
        userData.password_hash = await bcrypt.hash(userData.password, saltRounds);
        delete userData.password;
      }

      // Handle name combination
      if (userData.firstName && userData.lastName) {
        userData.name = `${userData.firstName} ${userData.lastName}`;
        delete userData.firstName;
        delete userData.lastName;
      }

      // Handle isActive conversion
      if (userData.isActive !== undefined) {
        userData.is_active = userData.isActive ? 1 : 0;
        delete userData.isActive;
      }

      const updatedUser = this.db.updateUser(id, userData);
      
      // Return user without password
      const { password_hash: _, ...userResponse } = updatedUser;
      return userResponse;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

export default UserService;
