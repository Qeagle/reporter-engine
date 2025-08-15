import React from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'annotation';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  annotationId?: number;
  metadata?: {
    assignedBy?: string;
    projectName?: string;
    dueDate?: string;
  };
}

class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: Array<(notifications: Notification[]) => void> = [];
  private websocket: WebSocket | null = null;

  constructor() {
    this.loadNotifications();
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Use the API URL for WebSocket connection
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const wsUrl = apiUrl.replace(/^http/, 'ws') + `/ws?token=${token}`;
      console.log('NotificationService - Connecting to WebSocket:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Notification WebSocket connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            this.addNotification(data.notification);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Notification WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.initializeWebSocket();
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  private loadNotifications() {
    try {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  private saveNotifications() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.notifications]));
  }

  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.push(callback);
    callback([...this.notifications]);
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    
    // Keep only the last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();
    this.notifySubscribers();

    // Show browser notification if permission is granted
    this.showBrowserNotification(newNotification);
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications();
      this.notifySubscribers();
    }
  }

  markAllAsRead() {
    let hasChanges = false;
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveNotifications();
      this.notifySubscribers();
    }
  }

  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifySubscribers();
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notifySubscribers();
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  private async showBrowserNotification(notification: Notification) {
    if (Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/analytics-360-favicon.svg',
          badge: '/analytics-360-favicon.svg',
          tag: notification.id,
          requireInteraction: notification.type === 'annotation'
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds for non-annotation notifications
        if (notification.type !== 'annotation') {
          setTimeout(() => {
            browserNotification.close();
          }, 5000);
        }
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Specific methods for annotation notifications
  async notifyAnnotationAssignment(
    annotationId: number,
    title: string,
    assignedBy: string,
    projectName: string,
    dueDate?: string
  ) {
    this.addNotification({
      title: 'New Assignment',
      message: `You have been assigned to "${title}" by ${assignedBy}`,
      type: 'annotation',
      actionUrl: `/analysis?annotation=${annotationId}`,
      annotationId,
      metadata: {
        assignedBy,
        projectName,
        dueDate
      }
    });

    // Also send to backend for persistence
    try {
      // TODO: Implement backend notification creation API
      /*
      await createNotification({
        type: 'annotation_assigned',
        title: 'New Assignment',
        message: `You have been assigned to "${title}" by ${assignedBy}`,
        annotation_id: annotationId,
        metadata: {
          assignedBy,
          projectName,
          dueDate
        }
      });
      */
    } catch (error) {
      console.error('Error creating backend notification:', error);
    }
  }

  async notifyAnnotationStatusChange(
    annotationId: number,
    title: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string
  ) {
    this.addNotification({
      title: 'Status Updated',
      message: `"${title}" status changed from ${oldStatus} to ${newStatus} by ${changedBy}`,
      type: 'annotation',
      actionUrl: `/analysis?annotation=${annotationId}`,
      annotationId,
      metadata: {
        assignedBy: changedBy
      }
    });
  }

  async notifyAnnotationComment(
    annotationId: number,
    title: string,
    commentBy: string
  ) {
    this.addNotification({
      title: 'New Comment',
      message: `${commentBy} commented on "${title}"`,
      type: 'annotation',
      actionUrl: `/analysis?annotation=${annotationId}`,
      annotationId,
      metadata: {
        assignedBy: commentBy
      }
    });
  }

  async notifyAnnotationDueSoon(
    annotationId: number,
    title: string,
    dueDate: string
  ) {
    this.addNotification({
      title: 'Due Soon',
      message: `"${title}" is due on ${new Date(dueDate).toLocaleDateString()}`,
      type: 'warning',
      actionUrl: `/analysis?annotation=${annotationId}`,
      annotationId,
      metadata: {
        dueDate
      }
    });
  }

  async notifyAnnotationOverdue(
    annotationId: number,
    title: string,
    dueDate: string
  ) {
    this.addNotification({
      title: 'Overdue',
      message: `"${title}" was due on ${new Date(dueDate).toLocaleDateString()}`,
      type: 'error',
      actionUrl: `/analysis?annotation=${annotationId}`,
      annotationId,
      metadata: {
        dueDate
      }
    });
  }

  destroy() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.subscribers = [];
  }
}

export const notificationService = new NotificationService();

// Export for use in React components
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  return {
    notifications,
    unreadCount: notificationService.getUnreadCount(),
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    deleteNotification: notificationService.deleteNotification.bind(notificationService),
    clearAll: notificationService.clearAll.bind(notificationService),
    requestPermission: notificationService.requestNotificationPermission.bind(notificationService)
  };
};

export default notificationService;
