import React, { useState, useEffect } from 'react';
import { Mail, Clock, Check, X, RefreshCw, Trash2, Shield, FolderOpen } from 'lucide-react';
import { invitationService, Invitation } from '../services/invitationService';
import toast from 'react-hot-toast';

interface InvitationManagementProps {
  projectId?: number;
}

const InvitationManagement: React.FC<InvitationManagementProps> = ({ projectId }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'revoked'>('all');

  useEffect(() => {
    loadInvitations();
  }, [projectId, filter]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filter !== 'all') {
        filters.status = filter;
      }
      if (projectId) {
        filters.projectId = projectId;
      }
      
      const data = await invitationService.getInvitations(filters);
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: number) => {
    try {
      await invitationService.resendInvitation(invitationId);
      toast.success('Invitation resent successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const handleRevoke = async (invitationId: number) => {
    try {
      await invitationService.revokeInvitation(invitationId);
      toast.success('Invitation revoked successfully');
      loadInvitations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'revoked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'accepted':
        return <Check className="w-4 h-4" />;
      case 'expired':
        return <Clock className="w-4 h-4" />;
      case 'revoked':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {['all', 'pending', 'accepted', 'expired', 'revoked'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Invitations list */}
      {invitations.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No invitations found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'No invitations have been sent yet.' : `No ${filter} invitations found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {invitation.email}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                      {getStatusIcon(invitation.status)}
                      <span className="ml-1">{invitation.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>
                        Role: {invitation.project_role_key || invitation.role_key || 'N/A'}
                      </span>
                    </div>
                    
                    {invitation.project_name && (
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-4 h-4" />
                        <span>Project: {invitation.project_name}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Sent: {formatDate(invitation.created_at)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span className={isExpired(invitation.expires_at) ? 'text-red-500' : ''}>
                        Expires: {formatDate(invitation.expires_at)}
                      </span>
                    </div>
                  </div>

                  {invitation.invited_by_email && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Invited by: {invitation.invited_by_name || invitation.invited_by_email}
                    </div>
                  )}

                  {invitation.accepted_at && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                      Accepted: {formatDate(invitation.accepted_at)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {invitation.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleResend(invitation.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-md transition-colors"
                      title="Resend invitation"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRevoke(invitation.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-md transition-colors"
                      title="Revoke invitation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitationManagement;
