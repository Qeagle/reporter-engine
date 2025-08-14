import DatabaseService from '../services/DatabaseService.js';
import FileUploadService from '../services/FileUploadService.js';
import bcrypt from 'bcryptjs';

class ProfileController {
  constructor() {
    this.databaseService = new DatabaseService();
    this.fileUploadService = new FileUploadService();
  }

  // Get current user's profile
  async getProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const user = this.databaseService.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Remove sensitive data
      const { password_hash, ...profile } = user;

      // Get base URL for full avatar URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      console.log('ProfileController - Base URL:', baseUrl);
      console.log('ProfileController - Protocol:', req.protocol);
      console.log('ProfileController - Host:', req.get('host'));

      res.json({
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
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  // Update user profile (excluding email)
  async updateProfile(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Validate input
      const validationErrors = this.validateProfileData(updates);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Remove email from updates (email can't be changed)
      const { email, password, ...allowedUpdates } = updates;

      // Convert boolean to integer for is_active if present
      if (allowedUpdates.is_active !== undefined) {
        allowedUpdates.is_active = allowedUpdates.is_active ? 1 : 0;
      }

      // Update user in database
      const updatedUser = this.databaseService.updateUser(userId, allowedUpdates);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Remove sensitive data from response
      const { password_hash, ...profile } = updatedUser;

      // Get base URL for full avatar URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
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
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  // Upload profile picture
  async uploadAvatar(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Validate uploaded file
      const validationErrors = this.fileUploadService.validateUploadedFile(req.file);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file',
          details: validationErrors
        });
      }

      // Get current user to delete old avatar
      const currentUser = this.databaseService.findUserById(userId);
      const oldAvatarFilename = currentUser?.avatar_url;

      // Process and save new avatar
      const processedImage = await this.fileUploadService.processProfileImage(
        req.file.buffer,
        req.file.originalname
      );

      // Update user with new avatar URL
      const updatedUser = this.databaseService.updateUser(userId, {
        avatar_url: processedImage.filename
      });

      // Delete old avatar if it exists
      if (oldAvatarFilename) {
        await this.fileUploadService.deleteProfileImage(oldAvatarFilename);
      }

      // Remove sensitive data from response
      const { password_hash, ...profile } = updatedUser;

      // Get base URL for full avatar URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      res.json({
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
      console.error('Error uploading avatar:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar'
      });
    }
  }

  // Delete profile picture
  async deleteAvatar(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const currentUser = this.databaseService.findUserById(userId);
      
      if (!currentUser || !currentUser.avatar_url) {
        return res.status(404).json({
          success: false,
          error: 'No avatar found'
        });
      }

      // Delete avatar files
      await this.fileUploadService.deleteProfileImage(currentUser.avatar_url);

      // Update user to remove avatar URL
      const updatedUser = this.databaseService.updateUser(userId, {
        avatar_url: null
      });

      // Remove sensitive data from response
      const { password_hash, ...profile } = updatedUser;

      res.json({
        success: true,
        message: 'Avatar deleted successfully',
        data: {
          profile
        }
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete avatar'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'All password fields are required'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'New passwords do not match'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
      }

      // Get current user
      const currentUser = this.databaseService.findUserById(userId);
      
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      this.databaseService.updateUser(userId, {
        password_hash: newPasswordHash
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }

  // Validate profile data
  validateProfileData(data) {
    const errors = [];

    if (data.display_name && data.display_name.length > 100) {
      errors.push('Display name must be less than 100 characters');
    }

    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
      errors.push('Invalid phone number format');
    }

    if (data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    if (data.website && data.website.length > 200) {
      errors.push('Website URL must be less than 200 characters');
    }

    if (data.website && data.website && !this.isValidUrl(data.website)) {
      errors.push('Invalid website URL format');
    }

    if (data.location && data.location.length > 100) {
      errors.push('Location must be less than 100 characters');
    }

    return errors;
  }

  // Validate URL format
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }
}

export default ProfileController;
