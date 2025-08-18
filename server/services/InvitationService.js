import crypto from 'crypto';
import DatabaseService from './DatabaseService.js';
import nodemailer from 'nodemailer';

class InvitationService {
  constructor() {
    this.db = new DatabaseService();
    this.setupEmailTransporter();
  }

  setupEmailTransporter() {
    // Setup email transporter (you can configure this with your email service)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Create a new user invitation
   */
  async createInvitation(invitationData) {
    try {
      const {
        email,
        invitedBy,
        roleId = null,
        projectId = null,
        projectRoleId = null
      } = invitationData;

      // Validate that user doesn't already exist
      const existingUser = this.db.findUserByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check for existing pending invitation
      const existingInvitation = this.db.db.prepare(`
        SELECT * FROM user_invitations 
        WHERE email = ? AND status = 'pending' AND expires_at > datetime('now')
      `).get(email);

      if (existingInvitation) {
        throw new Error('Pending invitation already exists for this email');
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insert invitation
      const stmt = this.db.db.prepare(`
        INSERT INTO user_invitations (
          email, token, invited_by, role_id, project_id, project_role_id, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        email,
        token,
        invitedBy,
        roleId,
        projectId,
        projectRoleId,
        expiresAt.toISOString()
      );

      const invitation = {
        id: result.lastInsertRowid,
        email,
        token,
        invitedBy,
        roleId,
        projectId,
        projectRoleId,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

      // Send invitation email
      await this.sendInvitationEmail(invitation);

      return invitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Get all invitations (with optional filters)
   */
  getAllInvitations(filters = {}) {
    try {
      let query = `
        SELECT i.*, 
               u.email as invited_by_email,
               u.name as invited_by_name,
               r.key as role_key,
               r.description as role_description,
               p.name as project_name,
               pr.key as project_role_key,
               pr.description as project_role_description
        FROM user_invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        LEFT JOIN roles r ON i.role_id = r.id
        LEFT JOIN projects p ON i.project_id = p.id
        LEFT JOIN roles pr ON i.project_role_id = pr.id
        WHERE 1=1
      `;

      const params = [];

      if (filters.status) {
        query += ' AND i.status = ?';
        params.push(filters.status);
      }

      if (filters.projectId) {
        query += ' AND i.project_id = ?';
        params.push(filters.projectId);
      }

      query += ' ORDER BY i.created_at DESC';

      return this.db.db.prepare(query).all(...params);
    } catch (error) {
      console.error('Error getting invitations:', error);
      throw error;
    }
  }

  /**
   * Get invitation by token
   */
  getInvitationByToken(token) {
    try {
      return this.db.db.prepare(`
        SELECT i.*, 
               u.email as invited_by_email,
               u.name as invited_by_name,
               r.key as role_key,
               p.name as project_name,
               pr.key as project_role_key
        FROM user_invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        LEFT JOIN roles r ON i.role_id = r.id
        LEFT JOIN projects p ON i.project_id = p.id
        LEFT JOIN roles pr ON i.project_role_id = pr.id
        WHERE i.token = ? AND i.status = 'pending' AND datetime(i.expires_at) > datetime('now')
      `).get(token);
    } catch (error) {
      console.error('Error getting invitation by token:', error);
      throw error;
    }
  }

  /**
   * Accept invitation and create user
   */
  async acceptInvitation(token, userData) {
    const transaction = this.db.db.transaction(() => {
      try {
        const invitation = this.getInvitationByToken(token);
        if (!invitation) {
          throw new Error('Invalid or expired invitation');
        }

        // Create user
        const userStmt = this.db.db.prepare(`
          INSERT INTO users (email, password_hash, name, is_active)
          VALUES (?, ?, ?, 1)
        `);

        const userResult = userStmt.run(
          invitation.email,
          userData.passwordHash,
          userData.name || invitation.email.split('@')[0]
        );

        const userId = userResult.lastInsertRowid;

        // Add user to project if it's a project invitation
        if (invitation.project_id && invitation.project_role_id) {
          const memberStmt = this.db.db.prepare(`
            INSERT INTO project_members (project_id, user_id, role_id)
            VALUES (?, ?, ?)
          `);
          memberStmt.run(invitation.project_id, userId, invitation.project_role_id);
        }

        // Mark invitation as accepted
        const updateStmt = this.db.db.prepare(`
          UPDATE user_invitations 
          SET status = 'accepted', accepted_at = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(invitation.id);

        return {
          userId,
          invitation
        };
      } catch (error) {
        console.error('Error accepting invitation:', error);
        throw error;
      }
    });

    return transaction();
  }

  /**
   * Revoke invitation
   */
  revokeInvitation(invitationId) {
    try {
      const stmt = this.db.db.prepare(`
        UPDATE user_invitations 
        SET status = 'revoked'
        WHERE id = ?
      `);
      
      const result = stmt.run(invitationId);
      return result.changes > 0;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      throw error;
    }
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId) {
    try {
      const invitation = this.db.db.prepare(`
        SELECT * FROM user_invitations WHERE id = ? AND status = 'pending'
      `).get(invitationId);

      if (!invitation) {
        throw new Error('Invitation not found or already processed');
      }

      // Check if invitation is expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      
      if (now > expiresAt) {
        // Extend expiration by 7 days
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        const stmt = this.db.db.prepare(`
          UPDATE user_invitations 
          SET expires_at = ?
          WHERE id = ?
        `);
        stmt.run(newExpiresAt.toISOString(), invitationId);

        invitation.expires_at = newExpiresAt.toISOString();
      }

      // Resend email
      await this.sendInvitationEmail(invitation);

      return true;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitation) {
    try {
      const acceptUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/accept-invitation/${invitation.token}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@testreport.com',
        to: invitation.email,
        subject: 'You\'ve been invited to join Test Reporter',
        html: this.generateInvitationEmailTemplate(invitation, acceptUrl)
      };

      // Check if we should send real emails or just log (controlled by SEND_EMAILS env var)
      const shouldSendEmail = process.env.SEND_EMAILS === 'true' || process.env.NODE_ENV === 'production';
      
      if (!shouldSendEmail) {
        console.log('📧 Invitation email (development mode - not sent):');
        console.log('To:', invitation.email);
        console.log('Accept URL:', acceptUrl);
        console.log('Token:', invitation.token);
        console.log('🔗 Copy this URL to test the invitation:');
        console.log(acceptUrl);
        return { messageId: 'dev-mode' };
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Invitation email sent to:', invitation.email);
      return result;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Don't throw error - invitation was created successfully
      return null;
    }
  }

  /**
   * Generate invitation email template
   */
  generateInvitationEmailTemplate(invitation, acceptUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>You're invited to Test Reporter</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Reporter Invitation</h1>
          </div>
          <div class="content">
            <h2>You've been invited!</h2>
            <p>You have been invited to join Test Reporter${invitation.project_name ? ` for the project "${invitation.project_name}"` : ''}.</p>
            
            ${invitation.project_role_key ? `<p><strong>Role:</strong> ${invitation.project_role_key}</p>` : ''}
            
            <p>Click the button below to accept your invitation and create your account:</p>
            
            <a href="${acceptUrl}" class="button">Accept Invitation</a>
            
            <p>This invitation will expire in 7 days.</p>
            
            <p>If you have any questions, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>Test Reporter - Automated Test Reporting Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Clean up expired invitations
   */
  cleanupExpiredInvitations() {
    try {
      const stmt = this.db.db.prepare(`
        UPDATE user_invitations 
        SET status = 'expired'
        WHERE status = 'pending' AND expires_at < datetime('now')
      `);
      
      const result = stmt.run();
      console.log(`🧹 Cleaned up ${result.changes} expired invitations`);
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      throw error;
    }
  }
}

export default InvitationService;
