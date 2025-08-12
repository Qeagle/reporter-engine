import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebhookService {
  constructor() {
    this.webhooksFile = path.join(__dirname, '../data/webhooks.json');
    this.ensureWebhooksFile();
  }

  async ensureWebhooksFile() {
    try {
      await fs.access(this.webhooksFile);
    } catch (error) {
      await fs.mkdir(path.dirname(this.webhooksFile), { recursive: true });
      await fs.writeFile(this.webhooksFile, JSON.stringify([], null, 2));
    }
  }

  async getAllWebhooks() {
    try {
      const data = await fs.readFile(this.webhooksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading webhooks file:', error);
      return [];
    }
  }

  async saveWebhooks(webhooks) {
    try {
      await fs.writeFile(this.webhooksFile, JSON.stringify(webhooks, null, 2));
    } catch (error) {
      console.error('Error saving webhooks file:', error);
      throw error;
    }
  }

  async createWebhook({ url, events, secret, userId }) {
    const webhooks = await this.getAllWebhooks();
    
    const webhook = {
      id: uuidv4(),
      url,
      events,
      secret,
      userId,
      active: true,
      createdAt: new Date().toISOString()
    };
    
    webhooks.push(webhook);
    await this.saveWebhooks(webhooks);
    
    return webhook;
  }

  async getUserWebhooks(userId) {
    const webhooks = await this.getAllWebhooks();
    return webhooks.filter(webhook => webhook.userId === userId);
  }

  async triggerWebhooks(eventType, payload) {
    try {
      const webhooks = await this.getAllWebhooks();
      const relevantWebhooks = webhooks.filter(webhook => 
        webhook.active && webhook.events.includes(eventType)
      );

      const promises = relevantWebhooks.map(webhook => 
        this.sendWebhook(webhook, eventType, payload)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error triggering webhooks:', error);
    }
  }

  async sendWebhook(webhook, eventType, payload) {
    try {
      const body = JSON.stringify({
        event: eventType,
        payload,
        timestamp: new Date().toISOString()
      });

      const signature = webhook.secret ? 
        this.generateSignature(body, webhook.secret) : null;

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'TestReport-Webhook/1.0'
      };

      if (signature) {
        headers['X-TestReport-Signature'] = signature;
      }

      // Mock webhook sending - replace with actual HTTP request
      console.log(`Sending webhook to ${webhook.url}:`, {
        event: eventType,
        payload
      });

      // In real implementation:
      // const response = await fetch(webhook.url, {
      //   method: 'POST',
      //   headers,
      //   body
      // });

      return true;
    } catch (error) {
      console.error(`Error sending webhook to ${webhook.url}:`, error);
      throw error;
    }
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
}

export default WebhookService;