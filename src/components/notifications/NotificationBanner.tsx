'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faServer,
  faLightbulb,
  faCog,
  faExclamationTriangle,
  faInfoCircle,
  faTimes,
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import styles from './NotificationBanner.module.css';

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: 'MAINTENANCE' | 'FEATURE' | 'UPDATE' | 'ANNOUNCEMENT' | 'ALERT' | 'GENERAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetRoles: string[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationIndicator() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        const unreadNotifications = (data.notifications || []).filter(
          (n: SystemNotification) => !n.isRead
        );
        setNotifications(unreadNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = (notificationId: number) => {
    setDismissedNotifications((prev) => new Set([...Array.from(prev), notificationId]));
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE':
        return faServer;
      case 'FEATURE':
        return faLightbulb;
      case 'UPDATE':
        return faCog;
      case 'ANNOUNCEMENT':
        return faBell;
      case 'ALERT':
        return faExclamationTriangle;
      default:
        return faInfoCircle;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // Filter out dismissed notifications
  const activeNotifications = notifications.filter((n) => !dismissedNotifications.has(n.id));

  // Don't render if no notifications or user not authenticated
  if (!user || activeNotifications.length === 0) {
    return null;
  }

  // Sort by priority (URGENT first, then HIGH, etc.)
  const sortedNotifications = [...activeNotifications].sort((a, b) => {
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    return (
      priorityOrder[a.priority as keyof typeof priorityOrder] -
      priorityOrder[b.priority as keyof typeof priorityOrder]
    );
  });

  return (
    <div className={styles.notificationIndicator}>
      {/* Notification Badge Button */}
      <button
        ref={buttonRef}
        className={styles.notificationButton}
        onClick={() => setShowDropdown(!showDropdown)}
        title={`${activeNotifications.length} unread notifications`}
      >
        <FontAwesomeIcon icon={faBell} className={styles.bellIcon} />
        {activeNotifications.length > 0 && (
          <span className={styles.notificationBadge}>
            {activeNotifications.length > 99 ? '99+' : activeNotifications.length}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div ref={dropdownRef} className={styles.notificationDropdown}>
          <div className={styles.dropdownHeader}>
            <h4>Notifications</h4>
            <span className={styles.notificationCount}>{activeNotifications.length} unread</span>
          </div>

          <div className={styles.notificationsList}>
            {sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationCard} ${styles[notification.priority.toLowerCase()]}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <FontAwesomeIcon
                      icon={getNotificationIcon(notification.type)}
                      className={`${styles.typeIcon} ${styles[notification.priority.toLowerCase()]}`}
                    />
                    <div className={styles.titleAndTime}>
                      <h5 className={styles.notificationTitle}>{notification.title}</h5>
                      <span className={styles.timeAgo}>
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${styles.priorityBadge} ${styles[notification.priority.toLowerCase()]}`}
                  >
                    {notification.priority}
                  </span>
                </div>

                <p className={styles.notificationMessage}>{notification.message}</p>

                <div className={styles.cardActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.markReadBtn}`}
                    onClick={() => markAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    Mark Read
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => deleteNotification(notification.id)}
                    title="Dismiss"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions Footer */}
          <div className={styles.dropdownFooter}>
            <button
              className={`${styles.footerBtn} ${styles.markAllBtn}`}
              onClick={() => {
                activeNotifications.forEach((notification) => {
                  markAsRead(notification.id);
                });
                setShowDropdown(false);
              }}
            >
              Mark All Read
            </button>
            <button
              className={`${styles.footerBtn} ${styles.dismissAllBtn}`}
              onClick={() => {
                activeNotifications.forEach((notification) => {
                  deleteNotification(notification.id);
                });
                setShowDropdown(false);
              }}
            >
              Dismiss All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
