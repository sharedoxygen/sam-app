'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faBook,
  faDownload,
  faPrint,
  faChevronRight,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

interface TocItem {
  id: string;
  title: string;
}

interface TocSection {
  id: string;
  title: string;
  items: TocItem[];
}

export default function AgentGuidePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('getting-started');

  // Load markdown content from API
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/docs/agent-guide');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load user guide');
        }

        setMarkdownContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
      alert('Print function is not available');
    }
  };

  const handleDownload = () => {
    try {
      // Create a downloadable version of the markdown
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AGENT_USER_GUIDE.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download function is not available');
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Extract table of contents from markdown headings
  const extractTableOfContents = (content: string): TocSection[] => {
    const headings = content.match(/^#{1,4}\s.+$/gm) || [];
    const sections: TocSection[] = [];
    let currentPart: TocSection | null = null;

    for (const heading of headings) {
      const level = heading.match(/^#+/)?.[0].length || 0;
      const title = heading.replace(/^#+\s/, '').replace(/\*\*/g, '');
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      if (level === 2 && title.includes('Part ')) {
        currentPart = {
          id,
          title,
          items: [],
        };
        sections.push(currentPart);
      } else if (level === 2 && currentPart) {
        currentPart.items.push({ id, title });
      } else if (level === 2) {
        // Top-level sections not in parts
        sections.push({
          id,
          title,
          items: [],
        });
      }
    }

    return sections;
  };

  const tableOfContents = markdownContent ? extractTableOfContents(markdownContent) : [];

  // Custom component for rendering headings with IDs for navigation
  const HeadingRenderer = ({ level, children, ...props }: any) => {
    const text = children?.toString() || '';
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    );
  };

  if (loading) {
    return (
      <div className={styles.guideContainer}>
        <div className={styles.loadingContainer}>
          <FontAwesomeIcon icon={faSpinner} spin className={styles.loadingIcon} />
          <p>Loading User Guide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.guideContainer}>
        <div className={styles.errorContainer}>
          <h2>Error Loading User Guide</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.guideContainer}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Application
        </button>

        <div className={styles.headerActions}>
          <button onClick={handlePrint} className={styles.actionButton}>
            <FontAwesomeIcon icon={faPrint} />
            Print Guide
          </button>
          <button onClick={handleDownload} className={styles.actionButton}>
            <FontAwesomeIcon icon={faDownload} />
            Download Guide
          </button>
        </div>
      </div>

      {/* Guide Content */}
      <div className={styles.guideContent}>
        <div className={styles.guideHeader}>
          <FontAwesomeIcon icon={faBook} className={styles.guideIcon} />
          <h1>Sales Activity Manager - Complete User Guide</h1>
          <p className={styles.guideSubtitle}>
            Comprehensive guide for Sales Agents, Service Agents, and Team Leads
          </p>
        </div>

        {/* Interactive Table of Contents */}
        {tableOfContents.length > 0 && (
          <div className={styles.tableOfContents}>
            <h2>📚 Table of Contents</h2>
            <div className={styles.tocGrid}>
              {tableOfContents.map((section) => (
                <div key={section.id} className={styles.tocSection}>
                  <h3>{section.title}</h3>
                  {section.items.length > 0 && (
                    <ul>
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => scrollToSection(item.id)}
                            className={`${styles.tocLink} ${activeSection === item.id ? styles.active : ''
                              }`}
                          >
                            <FontAwesomeIcon icon={faChevronRight} className={styles.tocIcon} />
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Role-specific Quick Access */}
        <div className={styles.quickAccess}>
          <h2>🎯 Quick Access by Role</h2>
          <div className={styles.roleCards}>
            {(user?.role === 'SALES' || user?.role === 'SALES_LEAD') && (
              <div className={styles.roleCard}>
                <h3>🏪 Sales Agent Quick Start</h3>
                <ul>
                  <li>
                    <button
                      onClick={() => scrollToSection('sales-agent-daily-workflow')}
                      className={styles.quickLink}
                    >
                      Daily Sales Workflow
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection('activity-tracking')}
                      className={styles.quickLink}
                    >
                      Activity Tracking
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection('performance-monitoring')}
                      className={styles.quickLink}
                    >
                      Performance Monitoring
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {(user?.role === 'SERVICE' || user?.role === 'SERVICE_LEAD') && (
              <div className={styles.roleCard}>
                <h3>🔧 Service Agent Quick Start</h3>
                <ul>
                  <li>
                    <button
                      onClick={() => scrollToSection('service-agent-daily-workflow')}
                      className={styles.quickLink}
                    >
                      Daily Service Workflow
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection('activity-tracking')}
                      className={styles.quickLink}
                    >
                      Activity Tracking
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => scrollToSection('performance-monitoring')}
                      className={styles.quickLink}
                    >
                      Performance Metrics
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {(user?.role === 'SALES_LEAD' ||
              user?.role === 'SERVICE_LEAD' ||
              user?.role === 'OFFICE_MANAGER' ||
              user?.role === 'ADMIN') && (
                <div className={styles.roleCard}>
                  <h3>👑 Team Lead Quick Start</h3>
                  <ul>
                    <li>
                      <button
                        onClick={() => scrollToSection('lead-management-workflow')}
                        className={styles.quickLink}
                      >
                        Lead Management Workflow
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => scrollToSection('performance-monitoring')}
                        className={styles.quickLink}
                      >
                        Team Performance
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => scrollToSection('task-management')}
                        className={styles.quickLink}
                      >
                        Task Management
                      </button>
                    </li>
                  </ul>
                </div>
              )}
          </div>
        </div>

        {/* Markdown Content */}
        <div className={styles.markdownContent}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <HeadingRenderer level={1} {...props} />,
              h2: (props) => <HeadingRenderer level={2} {...props} />,
              h3: (props) => <HeadingRenderer level={3} {...props} />,
              h4: (props) => <HeadingRenderer level={4} {...props} />,
              h5: (props) => <HeadingRenderer level={5} {...props} />,
              h6: (props) => <HeadingRenderer level={6} {...props} />,
            }}
          >
            {markdownContent}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>
          📞 Need Help? Contact your Team Lead or IT Support | 📚 More Training? Check the online
          learning portal | 🎯 Want to Improve? Schedule coaching with your Team Lead
        </p>
        <p className={styles.version}>
          Last Updated: December 2024 | Version: 2.0 | Maintained by: Development Team
        </p>
      </div>
    </div>
  );
}
