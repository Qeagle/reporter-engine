import { apiService } from './apiService';

export interface Invitation {
  id: number;
  email: string;
  token: string;
  invited_by: number;
  role_id?: number;
  project_id?: number;
  project_role_id?: number;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  invited_by_email?: string;
  invited_by_name?: string;
  role_key?: string;
  role_description?: string;
  project_name?: string;
  project_role_key?: string;
  project_role_description?: string;
}

export interface Role {
  id: number;
  key: string;
  scope: 'system' | 'project';
  description: string;
}

export interface CreateInvitationData {
  email: string;
  roleId?: number;
  projectId?: number;
  projectRoleId?: number;
}

export interface AcceptInvitationData {
  password: string;
  name?: string;
}

class InvitationService {
  async createInvitation(data: CreateInvitationData): Promise<Invitation> {
    const response = await apiService.post('/invitations/create', data);
    return response.data;
  }

  async getInvitations(filters?: { status?: string; projectId?: number }): Promise<Invitation[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.projectId) params.append('projectId', filters.projectId.toString());

    const response = await apiService.get(`/invitations/list?${params.toString()}`);
    return response.data;
  }

  async getInvitationByToken(token: string): Promise<any> {
    const response = await apiService.get(`/invitations/${token}`);
    return response.data;
  }

  async acceptInvitation(token: string, data: AcceptInvitationData): Promise<any> {
    const response = await apiService.post(`/invitations/${token}/accept`, data);
    return response.data;
  }

  async revokeInvitation(invitationId: number): Promise<void> {
    await apiService.post(`/invitations/${invitationId}/revoke`);
  }

  async resendInvitation(invitationId: number): Promise<void> {
    await apiService.post(`/invitations/${invitationId}/resend`);
  }

  async getRoles(scope?: 'system' | 'project'): Promise<Role[]> {
    const params = scope ? `?scope=${scope}` : '';
    const response = await apiService.get(`/invitations/roles${params}`);
    return response.data;
  }
}

export const invitationService = new InvitationService();
