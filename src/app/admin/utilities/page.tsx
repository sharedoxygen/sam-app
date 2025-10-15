'use client';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faCalculator,
  faCommentDots,
  faBullhorn,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';
import styles from './page.module.css';

export default function AdminUtilities() {
  const { user } = useAuth();
  const router = useRouter();

  // Only allow ADMIN or OFFICE_MANAGER
  if (user?.role !== 'ADMIN' && user?.role !== 'OFFICE_MANAGER') {
    if (typeof window !== 'undefined') router.replace('/');
    return null;
  }

  const cards = [
    {
      title: 'Agent Management',
      description: 'Add, edit, and manage all agents and their roles in your organization.',
      icon: faUsers,
      href: '/settings/users',
      color: '#6366f1',
    },
    {
      title: 'Salary Calculator',
      description: 'Calculate how many applications an agent must write to reach a target salary.',
      icon: faCalculator,
      href: '/admin/utilities/salary-calculator',
      color: '#10b981',
    },
    {
      title: 'Feedback Management',
      description:
        'View and manage user feedback submissions including bugs, enhancements, and general feedback.',
      icon: faCommentDots,
      href: '/admin/utilities/feedback-management',
      color: '#f59e0b',
    },
    {
      title: 'System Notifications',
      description: 'Broadcast announcements, alerts, and updates to users across the organization.',
      icon: faBullhorn,
      href: '/admin/utilities/system-notifications',
      color: '#e11d48',
    },
    {
      title: 'Audit Logs',
      description: 'View comprehensive system audit logs and track all user activities and data changes.',
      icon: faShieldAlt,
      href: '/admin/utilities/audit-logs',
      color: '#8b5cf6',
    },
    // Add more utilities here as needed
  ];

  return (
    <div className="container py-4">
      <h1 className="mb-4">Utilities</h1>
      <div className="row g-4">
        {cards.map((card, idx) => (
          <div className="col-md-4" key={card.title}>
            <div
              className={`${styles.utilityCard} card h-100 shadow-sm clickable`}
              tabIndex={0}
              role="button"
              aria-label={card.title}
              onClick={() => router.push(card.href)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && router.push(card.href)}
            >
              <div className="card-body d-flex flex-column align-items-center justify-content-center text-center">
                <FontAwesomeIcon
                  icon={card.icon}
                  className={`${styles.iconStyle} ${styles.withDynamicColor}`}
                  ref={(el) => {
                    if (el && el.style) {
                      el.style.color = card.color;
                    }
                  }}
                />
                <div className="fw-bold fs-5 mb-2">{card.title}</div>
                <div className={`text-muted mb-3 ${styles.description}`}>{card.description}</div>
                <span className="btn btn-outline-primary mt-auto">Open</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
