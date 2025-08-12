import WebhookService from '../services/WebhookService.js';

class WebhookController {
  constructor() {
    this.webhookService = new WebhookService();
  }

  async configureWebhook(req, res) {
    try {
      const { url, events, secret } = req.body;
      const userId = req.user?.userId;

      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          error: 'URL and events array are required'
        });
      }

      const webhook = await this.webhookService.createWebhook({
        url,
        events,
        secret,
        userId
      });

      res.status(201).json({
        success: true,
        data: webhook,
        message: 'Webhook configured successfully'
      });
    } catch (error) {
      console.error('Error configuring webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to configure webhook'
      });
    }
  }

  async listWebhooks(req, res) {
    try {
      const userId = req.user?.userId;
      const webhooks = await this.webhookService.getUserWebhooks(userId);

      res.json({
        success: true,
        data: webhooks
      });
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch webhooks'
      });
    }
  }

  async triggerTestComplete(req, res) {
    try {
      const { reportId, summary } = req.body;

      await this.webhookService.triggerWebhooks('test.completed', {
        reportId,
        summary,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Test complete webhooks triggered'
      });
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger webhooks'
      });
    }
  }

  async jenkinsNotification(req, res) {
    try {
      const { buildNumber, status, reportId } = req.body;

      // Process Jenkins notification
      console.log('Jenkins notification received:', { buildNumber, status, reportId });

      res.json({
        success: true,
        message: 'Jenkins notification processed'
      });
    } catch (error) {
      console.error('Error processing Jenkins notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Jenkins notification'
      });
    }
  }

  async githubNotification(req, res) {
    try {
      const { action, repository, pull_request } = req.body;

      // Process GitHub notification
      console.log('GitHub notification received:', { action, repository: repository?.name });

      res.json({
        success: true,
        message: 'GitHub notification processed'
      });
    } catch (error) {
      console.error('Error processing GitHub notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process GitHub notification'
      });
    }
  }
}

export default WebhookController;