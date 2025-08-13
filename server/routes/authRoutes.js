import express from 'express';
import AuthController from '../controllers/AuthController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const authController = new AuthController();

// Authentication routes (no auth required)
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// SSO routes (no auth required)
router.get('/sso/google', authController.googleSSO.bind(authController));
router.get('/sso/azure', authController.azureSSO.bind(authController));

// Profile management (requires authentication)
router.get('/profile', authMiddleware, authController.getProfile.bind(authController));

// Role and permission management (requires authentication)
router.get('/roles', authMiddleware, authController.getRoles.bind(authController));

export default router;