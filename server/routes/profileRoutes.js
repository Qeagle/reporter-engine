import express from 'express';
import ProfileController from '../controllers/ProfileController.js';
import FileUploadService from '../services/FileUploadService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const profileController = new ProfileController();
const fileUploadService = new FileUploadService();

// Apply authentication middleware to all profile routes
router.use(authMiddleware);

// Get current user's profile
router.get('/', profileController.getProfile.bind(profileController));

// Update profile information (excluding email)
router.put('/', profileController.updateProfile.bind(profileController));

// Upload profile picture
router.post('/avatar', 
  fileUploadService.getSingleUploadMiddleware('avatar'),
  profileController.uploadAvatar.bind(profileController)
);

// Delete profile picture
router.delete('/avatar', profileController.deleteAvatar.bind(profileController));

// Change password
router.put('/password', profileController.changePassword.bind(profileController));

export default router;
