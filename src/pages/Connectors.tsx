import React, { useState } from 'react';
import { 
  Zap, 
  Settings, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Mail,
  Webhook
} from 'lucide-react';

// Vendor Icon Components
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129V8.915A5.218 5.218 0 0 0 18.294 3.7V5.757zm5.701-5.757H11.456a5.215 5.215 0 0 0 5.215 5.215h2.129V2.129A5.218 5.218 0 0 0 23.995 0V5.757z" />
  </svg>
);

const RallyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 18.432h-2.97l-2.43-6.048h-2.736v6.048H6.48V5.568h5.67c3.078 0 4.86 1.512 4.86 4.32 0 2.106-.918 3.51-2.538 4.05l2.97 4.494h.126zm-8.136-8.424h2.322c1.458 0 2.268-.648 2.268-1.944 0-1.296-.81-1.944-2.268-1.944H9.432v3.888z" />
  </svg>
);

const AzureDevOpsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 8.5v7l4.67 3.25V15l7.59-2.09v6.84l7.74-3V3.25L12.26 0v6.84L4.67 8.5H0zm7.74 3.66L12 11.5l4.26.66v2.68L12 15.5l-4.26-.66v-2.68z" />
  </svg>
);

const GitLabIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.918 1.263c-.135-.423-.73-.423-.867 0L1.386 9.45.044 13.587a.905.905 0 0 0 .331 1.023L12 23.054l11.625-8.443a.905.905 0 0 0 .33-1.024" />
  </svg>
);

const MondayIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4zm-1.2 4.8v9.6h2.4V7.2h-2.4zm-3.6 2.4v7.2h2.4V9.6H7.2zm7.2 1.2v6h2.4v-6h-2.4z" />
  </svg>
);

const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

const TeamsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.625 7.5c-.844 0-1.575.374-2.086.954v-.079c0-2.75-2.25-5-5-5-2.75 0-5 2.25-5 5v.079c-.511-.58-1.242-.954-2.086-.954C4.617 7.5 3 9.117 3 11.063v5.562c0 1.946 1.617 3.563 3.453 3.563.845 0 1.575-.374 2.086-.955v.392c0 1.381 1.119 2.5 2.5 2.5h5.922c1.381 0 2.5-1.119 2.5-2.5v-.392c.511.581 1.241.955 2.086.955 1.836 0 3.453-1.617 3.453-3.563v-5.562C24 9.117 22.461 7.5 20.625 7.5zM6.453 18.375c-.691 0-1.266-.575-1.266-1.266V11.95c0-.691.575-1.266 1.266-1.266s1.266.575 1.266 1.266v5.159c0 .691-.575 1.266-1.266 1.266zm11.016 1.75h-5.922c-.345 0-.625-.28-.625-.625v-9.375c0-1.726 1.399-3.125 3.125-3.125s3.125 1.399 3.125 3.125v9.375c0 .345-.28.625-.625.625zm5.156-3.484c0 .691-.575 1.266-1.266 1.266s-1.266-.575-1.266-1.266V11.95c0-.691.575-1.266 1.266-1.266s1.266.575 1.266 1.266v4.691z" />
  </svg>
);

interface Integration {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  version: string;
  status: 'enabled' | 'not_connected';
  category: 'bug_tracking' | 'notification';
  website?: string;
}

const Connectors: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const integrations: Integration[] = [
    {
      id: 'jira-cloud',
      name: 'Jira Cloud',
      icon: JiraIcon,
      description: 'Integrate with Atlassian Jira Cloud for seamless issue tracking and project management.',
      version: '2.1.0',
      status: 'enabled',
      category: 'bug_tracking',
      website: 'https://www.atlassian.com/software/jira'
    },
    {
      id: 'rally',
      name: 'Rally',
      icon: RallyIcon,
      description: 'Connect to CA Rally (Broadcom) for agile project management and defect tracking.',
      version: '1.8.5',
      status: 'not_connected',
      category: 'bug_tracking',
      website: 'https://www.broadcom.com/products/software/value-stream-management/rally'
    },
    {
      id: 'azure-devops',
      name: 'Azure DevOps',
      icon: AzureDevOpsIcon,
      description: 'Integrate with Microsoft Azure DevOps for work item management and CI/CD workflows.',
      version: '3.2.1',
      status: 'not_connected',
      category: 'bug_tracking',
      website: 'https://azure.microsoft.com/en-us/services/devops/'
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      icon: GitLabIcon,
      description: 'Connect to GitLab for issue tracking, merge requests, and CI/CD pipeline integration.',
      version: '2.0.3',
      status: 'not_connected',
      category: 'bug_tracking',
      website: 'https://gitlab.com'
    },
    {
      id: 'monday',
      name: 'Monday.com',
      icon: MondayIcon,
      description: 'Integrate with Monday.com for project management and team collaboration workflows.',
      version: '1.5.2',
      status: 'not_connected',
      category: 'bug_tracking',
      website: 'https://monday.com'
    },
    // Notification Channels
    {
      id: 'email-server',
      name: 'Email Server',
      icon: Mail,
      description: 'Configure SMTP email notifications for test results, failures, and team updates.',
      version: '2.0.0',
      status: 'enabled',
      category: 'notification',
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: SlackIcon,
      description: 'Send real-time notifications to Slack channels for test results and team collaboration.',
      version: '1.9.4',
      status: 'not_connected',
      category: 'notification',
      website: 'https://slack.com'
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      icon: Webhook,
      description: 'Create custom webhook integrations to send test data to external systems and APIs.',
      version: '1.3.0',
      status: 'not_connected',
      category: 'notification',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      icon: TeamsIcon,
      description: 'Send notifications and updates to Microsoft Teams channels for better team coordination.',
      version: '1.7.1',
      status: 'not_connected',
      category: 'notification',
      website: 'https://teams.microsoft.com'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Integrations', count: integrations.length },
    { id: 'bug_tracking', name: 'Bug Tracking Systems', count: integrations.filter(i => i.category === 'bug_tracking').length },
    { id: 'notification', name: 'Notification Channels', count: integrations.filter(i => i.category === 'notification').length }
  ];

  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === selectedCategory);

  const getStatusIcon = (status: string) => {
    return status === 'enabled' ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-400" />
    );
  };

  const getStatusText = (status: string) => {
    return status === 'enabled' ? 'Enabled' : 'Not Connected';
  };

  const getStatusColor = (status: string) => {
    return status === 'enabled' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connectors
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage integrations for bug tracking, project management, and notifications
            </p>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Integration Categories
        </h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-opacity-20 bg-current">
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const IconComponent = integration.icon;
          return (
            <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        v{integration.version}
                      </p>
                    </div>
                  </div>
                  {integration.website && (
                    <a
                      href={integration.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                  {integration.description}
                </p>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(integration.status)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Status:
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(integration.status)}`}>
                    {getStatusText(integration.status)}
                  </span>
                </div>

                {/* Configure Button */}
                <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Integration Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.status === 'enabled').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Active Integrations
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {integrations.filter(i => i.status === 'not_connected').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Available to Configure
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {integrations.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Integrations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connectors;
