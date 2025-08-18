import InvitationService from '../services/InvitationService.js';
import bcrypt from 'bcryptjs';

class InvitationController {
  constructor() {
    this.invitationService = new InvitationService();
  }

  /**
   * Create a new invitation
   */
  async createInvitation(req, res) {
    try {
      const { email, roleId, projectId, projectRoleId } = req.body;
      const invitedBy = req.user?.userId || req.user?.id;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      if (!invitedBy) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Validate project invitation
      if (projectId && !projectRoleId) {
        return res.status(400).json({
          success: false,
          error: 'Project role is required for project invitations'
        });
      }

      const invitation = await this.invitationService.createInvitation({
        email,
        invitedBy,
        roleId,
        projectId,
        projectRoleId
      });

      res.status(201).json({
        success: true,
        data: invitation,
        message: 'Invitation created successfully'
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all invitations
   */
  async getInvitations(req, res) {
    try {
      const { status, projectId } = req.query;
      
      const invitations = this.invitationService.getAllInvitations({
        status,
        projectId
      });

      res.json({
        success: true,
        data: invitations
      });
    } catch (error) {
      console.error('Error getting invitations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve invitations'
      });
    }
  }

  /**
   * Get invitation details by token (for the invitation acceptance page)
   */
  async getInvitationByToken(req, res) {
    try {
      const { token } = req.params;
      console.log('🔍 Getting invitation by token:', token);

      const invitation = this.invitationService.getInvitationByToken(token);
      console.log('📋 Invitation found:', invitation ? 'YES' : 'NO');

      if (!invitation) {
        console.log('❌ No invitation found for token:', token);
        return res.status(404).json({
          success: false,
          error: 'Invalid or expired invitation'
        });
      }

      // Don't expose sensitive information
      const safeInvitation = {
        email: invitation.email,
        projectName: invitation.project_name,
        roleName: invitation.project_role_key || invitation.role_key,
        invitedBy: invitation.invited_by_name || invitation.invited_by_email,
        createdAt: invitation.created_at,
        expiresAt: invitation.expires_at
      };

      console.log('✅ Returning safe invitation data for:', invitation.email);
      res.json({
        success: true,
        data: safeInvitation
      });
    } catch (error) {
      console.error('❌ Error getting invitation by token:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve invitation'
      });
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(req, res) {
    try {
      const { token } = req.params;
      const { password, name } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await this.invitationService.acceptInvitation(token, {
        passwordHash,
        name
      });

      res.json({
        success: true,
        data: {
          userId: result.userId,
          email: result.invitation.email,
          projectId: result.invitation.project_id
        },
        message: 'Invitation accepted successfully'
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      const success = this.invitationService.revokeInvitation(invitationId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Invitation not found'
        });
      }

      res.json({
        success: true,
        message: 'Invitation revoked successfully'
      });
    } catch (error) {
      console.error('Error revoking invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke invitation'
      });
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      await this.invitationService.resendInvitation(invitationId);

      res.json({
        success: true,
        message: 'Invitation resent successfully'
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available roles for invitations
   */
  async getRoles(req, res) {
    try {
      const { scope } = req.query; // 'system' or 'project'
      
      let query = 'SELECT * FROM roles';
      const params = [];

      if (scope) {
        query += ' WHERE scope = ?';
        params.push(scope);
      }

      query += ' ORDER BY scope, key';

      const roles = this.invitationService.db.db.prepare(query).all(...params);

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Error getting roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve roles'
      });
    }
  }
}

export default InvitationController;
