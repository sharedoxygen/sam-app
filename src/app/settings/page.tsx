'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faCog, faBell, faShield, faSave } from '@fortawesome/free-solid-svg-icons';

// Import CSS module
import styles from './page.module.css';

type SettingsState = {
  profile: {
    name: string;
    email: string;
    phone: string;
    timezone: string;
  };
  preferences: {
    darkMode: boolean;
    emailNotifications: boolean;
    appNotifications: boolean;
    defaultPage: string;
    primaryColor: string;
  };
  security: {
    twoFactorAuth: boolean;
    loginAlerts: boolean;
    passwordAge: number;
  };
};

export default function Settings() {
  const [settings, setSettings] = useState<SettingsState>({
    profile: {
      name: '',
      email: '',
      phone: '',
      timezone: 'America/New_York',
    },
    preferences: {
      darkMode: false,
      emailNotifications: true,
      appNotifications: true,
      defaultPage: 'dashboard',
      primaryColor: '#4a90e2',
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true,
      passwordAge: 90,
    },
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<null | 'saving' | 'success' | 'error'>(null);

  useEffect(() => {
    // In a real app, this would fetch user settings from an API
    setTimeout(() => {
      // Mock API response with user settings
      setSettings({
        profile: {
          name: 'Demo Agent',
          email: 'agent@example.com',
          phone: '(555) 123-4567',
          timezone: 'America/New_York',
        },
        preferences: {
          darkMode: false,
          emailNotifications: true,
          appNotifications: true,
          defaultPage: 'dashboard',
          primaryColor: '#4a90e2',
        },
        security: {
          twoFactorAuth: false,
          loginAlerts: true,
          passwordAge: 90,
        },
      });
      setLoading(false);
    }, 500);
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      profile: {
        ...settings.profile,
        [name]: value,
      },
    });
  };

  const handlePreferencesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [name]: newValue,
      },
    });
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [name]: type === 'number' ? parseInt(value) : newValue,
      },
    });
  };

  const saveSettings = () => {
    setSaveStatus('saving');

    // Simulate API call to save settings
    setTimeout(() => {
      setSaveStatus('success');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title mb-0">Settings</h1>
        <button
          className="btn btn-primary"
          onClick={saveSettings}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              Saving...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} className="me-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div className="alert alert-success" role="alert">
          Your settings have been saved successfully.
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="alert alert-danger" role="alert">
          There was an error saving your settings. Please try again.
        </div>
      )}

      <div className={styles.settingsContainer}>
        <div className={styles.settingsSidebar}>
          <div className="list-group list-group-flush">
            <button
              type="button"
              className={`list-group-item list-group-item-action ${activeTab === 'profile' ? styles.listGroupItemActive : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <FontAwesomeIcon icon={faUser} className="me-2" />
              Profile
            </button>
            <button
              type="button"
              className={`list-group-item list-group-item-action ${activeTab === 'preferences' ? styles.listGroupItemActive : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <FontAwesomeIcon icon={faCog} className="me-2" />
              Preferences
            </button>
            <button
              type="button"
              className={`list-group-item list-group-item-action ${activeTab === 'notifications' ? styles.listGroupItemActive : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <FontAwesomeIcon icon={faBell} className="me-2" />
              Notifications
            </button>
            <button
              type="button"
              className={`list-group-item list-group-item-action ${activeTab === 'security' ? styles.listGroupItemActive : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FontAwesomeIcon icon={faShield} className="me-2" />
              Security
            </button>
          </div>
        </div>

        <div className={styles.settingsContent}>
          {activeTab === 'profile' && (
            <div className="settings-panel">
              <h2 className={styles.settingsTitle}>Profile Settings</h2>
              <p className="text-muted mb-4">Manage your personal information and preferences.</p>

              <form>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={settings.profile.name}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={settings.profile.email}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={settings.profile.phone}
                    onChange={handleProfileChange}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="timezone" className="form-label">
                    Timezone
                  </label>
                  <select
                    className="form-select"
                    id="timezone"
                    name="timezone"
                    value={settings.profile.timezone}
                    onChange={handleProfileChange}
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  </select>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="settings-panel">
              <h2 className={styles.settingsTitle}>Preferences</h2>
              <p className="text-muted mb-4">Customize your application experience.</p>

              <form>
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="darkMode"
                    name="darkMode"
                    checked={settings.preferences.darkMode}
                    onChange={handlePreferencesChange}
                  />
                  <label className="form-check-label" htmlFor="darkMode">
                    Dark Mode
                  </label>
                </div>

                <div className="mb-3">
                  <label htmlFor="defaultPage" className="form-label">
                    Default Landing Page
                  </label>
                  <select
                    className="form-select"
                    id="defaultPage"
                    name="defaultPage"
                    value={settings.preferences.defaultPage}
                    onChange={handlePreferencesChange}
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="daily-activity">Daily Activity</option>
                    <option value="weekly-summary">Weekly Summary</option>
                    <option value="sales-tasks">Sales Tasks</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="primaryColor" className="form-label">
                    Primary Color
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <div
                        ref={(el) => {
                          if (el) {
                            el.style.backgroundColor = settings.preferences.primaryColor;
                          }
                        }}
                        className={styles.colorPreview}
                      ></div>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      id="primaryColor"
                      name="primaryColor"
                      value={settings.preferences.primaryColor}
                      onChange={handlePreferencesChange}
                    />
                  </div>
                  <div className="form-text">Enter a valid hex color code (e.g., #4a90e2)</div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-panel">
              <h2 className={styles.settingsTitle}>Notification Settings</h2>
              <p className="text-muted mb-4">Configure how you receive notifications.</p>

              <form>
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="emailNotifications"
                    name="emailNotifications"
                    checked={settings.preferences.emailNotifications}
                    onChange={handlePreferencesChange}
                  />
                  <label className="form-check-label" htmlFor="emailNotifications">
                    Email Notifications
                  </label>
                </div>

                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="appNotifications"
                    name="appNotifications"
                    checked={settings.preferences.appNotifications}
                    onChange={handlePreferencesChange}
                  />
                  <label className="form-check-label" htmlFor="appNotifications">
                    In-App Notifications
                  </label>
                </div>

                <div className="mt-4">
                  <h5>Notification Types</h5>
                  <div className="form-check mb-2">
                    <input className="form-check-input" type="checkbox" id="notifyTasks" checked />
                    <label className="form-check-label" htmlFor="notifyTasks">
                      Task Reminders
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifyActivities"
                      checked
                    />
                    <label className="form-check-label" htmlFor="notifyActivities">
                      Activity Confirmations
                    </label>
                  </div>
                  <div className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="notifyReports"
                      checked
                    />
                    <label className="form-check-label" htmlFor="notifyReports">
                      Weekly Reports
                    </label>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-panel">
              <h2 className={styles.settingsTitle}>Security Settings</h2>
              <p className="text-muted mb-4">Manage your account security preferences.</p>

              <form>
                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="twoFactorAuth"
                    name="twoFactorAuth"
                    checked={settings.security.twoFactorAuth}
                    onChange={handleSecurityChange}
                  />
                  <label className="form-check-label" htmlFor="twoFactorAuth">
                    Two-Factor Authentication
                  </label>
                </div>

                <div className="mb-3 form-check form-switch">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="loginAlerts"
                    name="loginAlerts"
                    checked={settings.security.loginAlerts}
                    onChange={handleSecurityChange}
                  />
                  <label className="form-check-label" htmlFor="loginAlerts">
                    Login Alerts
                  </label>
                </div>

                <div className="mb-3">
                  <label htmlFor="passwordAge" className="form-label">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="passwordAge"
                    name="passwordAge"
                    value={settings.security.passwordAge}
                    onChange={handleSecurityChange}
                    min="30"
                    max="365"
                  />
                  <div className="form-text">Number of days before password expires</div>
                </div>

                <div className="mb-3">
                  <button type="button" className="btn btn-outline-secondary">
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
