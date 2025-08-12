import express from 'express';
import AuthController from '../controllers/AuthController.js';

const router = express.Router();
const authController = new AuthController();

// Authentication routes
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// SSO routes
router.get('/sso/google', authController.googleSSO.bind(authController));
router.get('/sso/azure', authController.azureSSO.bind(authController));

// Profile management
router.get('/profile', authController.getProfile.bind(authController));

// Role and permission management
router.get('/roles', authController.getRoles.bind(authController));

export default router;