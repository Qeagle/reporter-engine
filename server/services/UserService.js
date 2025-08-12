import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UserService {
  constructor() {
    this.usersFile = path.join(__dirname, '../data/users.json');
    this.ensureUsersFile();
  }

  async ensureUsersFile() {
    try {
      await fs.access(this.usersFile);
    } catch (error) {
      // File doesn't exist, create it with default admin user
      const defaultUsers = [
        {
          id: uuidv4(),
          username: 'admin',
          email: 'admin@testreport.com',
          passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvKnOcIlUK.BnQS', // password: admin
          role: 'admin',
          createdAt: new Date().toISOString()
        }
      ];
      
      await fs.mkdir(path.dirname(this.usersFile), { recursive: true });
      await fs.writeFile(this.usersFile, JSON.stringify(defaultUsers, null, 2));
    }
  }

  async getAllUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading users file:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error saving users file:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    const users = await this.getAllUsers();
    return users.find(user => user.username === username);
  }

  async findById(id) {
    const users = await this.getAllUsers();
    return users.find(user => user.id === id);
  }

  async createUser(userData) {
    const users = await this.getAllUsers();
    
    const newUser = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await this.saveUsers(users);
    
    return newUser;
  }

  async updateUser(id, updateData) {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(user => user.id === id);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    users[userIndex] = { ...users[userIndex], ...updateData };
    await this.saveUsers(users);
    
    return users[userIndex];
  }

  async deleteUser(id) {
    const users = await this.getAllUsers();
    const filteredUsers = users.filter(user => user.id !== id);
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }
    
    await this.saveUsers(filteredUsers);
    return true;
  }
}

export default UserService;