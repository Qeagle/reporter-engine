import DatabaseService from '../services/DatabaseService.js';
import FileUploadService from '../services/FileUploadService.js';
import bcrypt from 'bcryptjs';

class ProfileController {
  constructor() {
    this.databaseService = new DatabaseService();
    this.fileUploadService = new FileUploadService();
  }

  // Resolve a real DB user id: numeric id -> email/username
  resolveUserId(req) {
    const u = req?.user || {};

    const rawId = u.userId ?? u.id;
    if (rawId !== undefined && rawId !== null) {
      const s = String(rawId).trim();
      if (/^\d+$/.test(s)) return parseInt(s, 10);
    }

    const email = u.email ?? u.username;
    if (email && this.databaseService.findUserByEmail) {
      const found = this.databaseService.findUserByEmail(email);
      if (found?.id) return found.id;
    }

    return null; // not resolvable to a real DB user
  }

  // Get current user's profile
  async getProfile(req, res) {
    try {
      const userId = this.resolveUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      const user = this.databaseService.findUserById(userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const { password_hash, ...profile } = user;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        success: true,
        data: {
          profile: {
            ...profile,
            avatarUrl: user.avatar_url ? `${baseUrl}/uploads/profiles/${user.avatar_url}` : null,
            thumbnailUrl: user.avatar_url ? `${baseUrl}/uploads/profiles/thumb-${user.avatar_url}` : null
          }
        }
      });
    } catch (error) {
      console.error('Error getting profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
  }

  // Update user profile (excluding email)
  async updateProfile(req, res) {
    try {
      const userId = this.resolveUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      const updates = req.body;
      return await this.processProfileUpdate(req, res, userId, updates);
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  }

  async processProfileUpdate(req, res, userId, updates) {
    try {
      const validationErrors = this.validateProfileData(updates);
      if (validationErrors.length) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: validationErrors });
      }

      // email/password not updatable here
      const { email, password, ...allowedUpdates } = updates;

      if (allowedUpdates.is_active !== undefined) {
        allowedUpdates.is_active = allowedUpdates.is_active ? 1 : 0;
      }

      const updatedUser = this.databaseService.updateUser(userId, allowedUpdates);
      if (!updatedUser) return res.status(404).json({ success: false, error: 'User not found' });

      const { password_hash, ...profile } = updatedUser;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile: {
            ...profile,
            avatarUrl: profile.avatar_url ? `${baseUrl}/uploads/profiles/${profile.avatar_url}` : null,
            thumbnailUrl: profile.avatar_url ? `${baseUrl}/uploads/profiles/thumb-${profile.avatar_url}` : null
          }
        }
      });
    } catch (error) {
      console.error('Error in processProfileUpdate:', error);
      throw error;
    }
  }

  // Upload profile picture
  async uploadAvatar(req, res) {
    try {
      const userId = this.resolveUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      return await this.processAvatarUpload(req, res, userId);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return res.status(500).json({ success: false, error: 'Failed to upload avatar' });
    }
  }

  async processAvatarUpload(req, res, userId) {
    try {
      const validationErrors = this.fileUploadService.validateUploadedFile(req.file);
      if (validationErrors.length) {
        return res.status(400).json({ success: false, error: 'Invalid file', details: validationErrors });
      }

      const currentUser = this.databaseService.findUserById(userId);
      if (!currentUser) return res.status(404).json({ success: false, error: 'User not found' });

      const oldAvatarFilename = currentUser.avatar_url;

      const processedImage = await this.fileUploadService.processProfileImage(
        req.file.buffer,
        req.file.originalname
      );

      const updatedUser = this.databaseService.updateUser(userId, { avatar_url: processedImage.filename });

      if (oldAvatarFilename) {
        await this.fileUploadService.deleteProfileImage(oldAvatarFilename);
      }

      const { password_hash, ...profile } = updatedUser;
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          profile: {
            ...profile,
            avatarUrl: `${baseUrl}${processedImage.url}`,
            thumbnailUrl: `${baseUrl}${processedImage.thumbnailUrl}`
          },
          upload: {
            filename: processedImage.filename,
            size: processedImage.size,
            url: `${baseUrl}${processedImage.url}`,
            thumbnailUrl: `${baseUrl}${processedImage.thumbnailUrl}`
          }
        }
      });
    } catch (error) {
      console.error('Error in processAvatarUpload:', error);
      throw error;
    }
  }

  // Delete profile picture
  async deleteAvatar(req, res) {
    try {
      const userId = this.resolveUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      return await this.processAvatarDeletion(req, res, userId);
    } catch (error) {
      console.error('Error deleting avatar:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete avatar' });
    }
  }

  async processAvatarDeletion(req, res, userId) {
    try {
      const currentUser = this.databaseService.findUserById(userId);
      if (!currentUser || !currentUser.avatar_url) {
        return res.status(404).json({ success: false, error: 'No avatar found' });
      }

      await this.fileUploadService.deleteProfileImage(currentUser.avatar_url);

      const updatedUser = this.databaseService.updateUser(userId, { avatar_url: null });
      const { password_hash, ...profile } = updatedUser;

      return res.json({
        success: true,
        message: 'Avatar deleted successfully',
        data: { profile }
      });
    } catch (error) {
      console.error('Error in processAvatarDeletion:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = this.resolveUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'User not authenticated' });

      const { currentPassword, newPassword, confirmPassword } = req.body;
      return await this.processPasswordChange(req, res, userId, { currentPassword, newPassword, confirmPassword });
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ success: false, error: 'Failed to change password' });
    }
  }

  async processPasswordChange(req, res, userId, { currentPassword, newPassword, confirmPassword }) {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, error: 'All password fields are required' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'New passwords do not match' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long' });
      }

      const currentUser = this.databaseService.findUserById(userId);
      if (!currentUser) return res.status(404).json({ success: false, error: 'User not found' });

      const ok = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!ok) return res.status(400).json({ success: false, error: 'Current password is incorrect' });

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      this.databaseService.updateUser(userId, { password_hash: newPasswordHash });

      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error in processPasswordChange:', error);
      throw error;
    }
  }

  // Validation
  validateProfileData(data) {
    const errors = [];
    if (data.display_name && data.display_name.length > 100) errors.push('Display name must be less than 100 characters');
    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) errors.push('Invalid phone number format');
    if (data.bio && data.bio.length > 500) errors.push('Bio must be less than 500 characters');
    if (data.website && data.website.length > 200) errors.push('Website URL must be less than 200 characters');
    if (data.website && !this.isValidUrl(data.website)) errors.push('Invalid website URL format');
    if (data.location && data.location.length > 100) errors.push('Location must be less than 100 characters');
    return errors;
  }

  isValidUrl(string) {
    try { new URL(string); return true; } catch { return false; }
  }
}

export default ProfileController;
