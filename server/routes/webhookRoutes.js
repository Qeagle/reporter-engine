import express from 'express';
import WebhookController from '../controllers/WebhookController.js';

const router = express.Router();
const webhookController = new WebhookController();

// Webhook management
router.post('/configure', webhookController.configureWebhook.bind(webhookController));
router.get('/list', webhookController.listWebhooks.bind(webhookController));

// Webhook triggers
router.post('/test-complete', webhookController.triggerTestComplete.bind(webhookController));
router.post('/jenkins', webhookController.jenkinsNotification.bind(webhookController));
router.post('/github', webhookController.githubNotification.bind(webhookController));

export default router;