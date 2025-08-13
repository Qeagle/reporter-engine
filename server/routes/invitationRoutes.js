import express from 'express';
import InvitationController from '../controllers/InvitationController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const invitationController = new InvitationController();

// Protected routes (require authentication)
router.post('/create', authMiddleware, invitationController.createInvitation.bind(invitationController));
router.get('/list', authMiddleware, invitationController.getInvitations.bind(invitationController));
router.post('/:invitationId/revoke', authMiddleware, invitationController.revokeInvitation.bind(invitationController));
router.post('/:invitationId/resend', authMiddleware, invitationController.resendInvitation.bind(invitationController));
router.get('/roles', authMiddleware, invitationController.getRoles.bind(invitationController));

// Public routes (for invitation acceptance)
router.get('/:token', invitationController.getInvitationByToken.bind(invitationController));
router.post('/:token/accept', invitationController.acceptInvitation.bind(invitationController));

export default router;
