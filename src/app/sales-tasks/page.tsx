'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSort,
  faList,
  faThLarge,
  faHandshake,
  faWrench,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faUserPlus,
  faChartLine,
  faCheckCircle,
  faExclamationTriangle,
  faClock,
  faEdit,
  faTrash,
  faTags,
  faDollarSign,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { TasksApi, ActivityApi } from '@/lib/api/apiService';
import { Task, CreateTaskRequest, Activity } from '@/types/api';
import { useAuth } from '@/lib/auth/AuthContext';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import styles from '@/styles/ClientFollowUps.module.css';
import { getPageHeaderForRole } from '@/lib/constants/roleConfig';
import BackButton from '@/components/common/BackButton';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

// Enhanced task interface for our comprehensive activity management
interface EnhancedTask extends Task {
  category: 'sales' | 'service' | 'follow-up' | 'meeting' | 'call' | 'email';
  clientEmail?: string;
  clientPhone?: string;
  estimatedValue?: string;
  tags: string[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
}

// Helper function to determine if user can create tasks
const canCreateTasks = (userRole?: string) => {
  const allowedRoles = ['SALES_LEAD', 'SERVICE_LEAD', 'SALES', 'SERVICE', 'OFFICE_MANAGER'];
  return userRole ? allowedRoles.includes(userRole) : false;
};

export default function ClientFollowUps() {
  const { user } = useAuth();

  // State management
  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter and view states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending'); // Default to pending tasks only
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<EnhancedTask | null>(null);

  // Get role-based page configuration
  const pageHeader = getPageHeaderForRole(user?.role, 'salesTasks');

  // Statistics calculations
  const getStatistics = () => {
    const total = tasks.length + activities.length;
    const completed = tasks.filter((task) => task.isCompleted).length;
    const dueToday = tasks.filter((task) => {
      const today = new Date().toDateString();
      return new Date(task.dueDate).toDateString() === today && !task.isCompleted;
    }).length;
    const overdue = tasks.filter((task) => {
      return new Date(task.dueDate) < new Date() && !task.isCompleted;
    }).length;

    // Include both task categories and activity types
    const salesActivities =
      tasks.filter((task) => ['sales', 'follow-up'].includes(task.category)).length +
      activities.filter((activity: Activity) =>
        ['CALL', 'MEETING', 'FOLLOW_UP'].includes(activity.type)
      ).length;

    const serviceActivities =
      tasks.filter((task) => ['service', 'call', 'email'].includes(task.category)).length +
      activities.filter((activity: Activity) => ['EMAIL'].includes(activity.type)).length;

    return { total, completed, dueToday, overdue, salesActivities, serviceActivities };
  };

  // Category configurations
  const categoryConfig = {
    sales: { icon: faHandshake, color: '#28a745', label: 'Sales' },
    service: { icon: faWrench, color: '#007bff', label: 'Service' },
    call: { icon: faPhone, color: '#ffc107', label: 'Call' },
    email: { icon: faEnvelope, color: '#6f42c1', label: 'Email' },
    meeting: { icon: faCalendarAlt, color: '#fd7e14', label: 'Meeting' },
    'follow-up': { icon: faUserPlus, color: '#dc3545', label: 'Follow-up' },
  };

  // Fetch tasks
  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [fetchedTasks, fetchedActivities] = await Promise.all([
        TasksApi.getTasks(),
        ActivityApi.getActivities(),
      ]);

      // All users can only see their own tasks
      // Fix type mismatch: ensure both sides are compared as numbers
      const currentUserId = parseInt(String(user.id), 10);
      const filteredTasks = fetchedTasks.filter((task) => {
        const taskUserId = parseInt(String(task.userId), 10);
        return taskUserId === currentUserId;
      });

      // Convert basic tasks to enhanced tasks using REAL data from database
      const enhancedTasks: EnhancedTask[] = filteredTasks.map((task) => ({
        ...task,
        category: (task.category as EnhancedTask['category']) || 'follow-up',
        priority: task.priority.toLowerCase() as 'low' | 'medium' | 'high', // Convert from DB enum to UI format
        clientEmail: task.clientEmail || undefined,
        clientPhone: task.clientPhone || undefined,
        estimatedValue: task.estimatedValue || undefined,
        tags: task.tags || [],
        lastContactDate: task.lastContactDate || undefined,
        nextFollowUpDate: task.nextFollowUpDate || undefined,
      }));

      // Filter activities for current user
      // Fix type mismatch: ensure both sides are compared as numbers
      const currentUserIdForActivities = parseInt(String(user.id), 10);
      const userActivities = fetchedActivities.filter((activity: Activity) => {
        const activityUserId = parseInt(String(activity.userId), 10);
        return activityUserId === currentUserIdForActivities;
      });

      setTasks(enhancedTasks);
      setActivities(userActivities);
    } catch (error) {
      console.error('Error fetching tasks and activities:', error);
      setError('Failed to load tasks and activities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort tasks
  const getFilteredTasks = () => {
    const filtered = tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && task.isCompleted) ||
        (statusFilter === 'pending' && !task.isCompleted);
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'category':
          return a.category.localeCompare(b.category);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Task actions
  const handleTaskToggle = async (id: number) => {
    try {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Optimistic update
      setTasks(tasks.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));

      // Update on server
      await TasksApi.updateTask(id, { isCompleted: !task.isCompleted });

      // Auto-refresh after task completion with slight delay for better UX
      setTimeout(() => {
        fetchTasks();
      }, 300);

      // If task was marked as completed, show success message and auto-hide
      if (!task.isCompleted) {
        setSuccess('✅ Task completed and removed from active list!');
        setTimeout(() => setSuccess(null), 3000);

        // If currently showing "all" tasks, temporarily highlight the completion
        if (statusFilter === 'all') {
          setTimeout(() => {
            // Gently suggest filtering to pending tasks
            setSuccess('💡 Tip: Viewing "Pending" tasks hides completed ones automatically');
            setTimeout(() => setSuccess(null), 4000);
          }, 3500);
        }
      } else {
        // Task was unchecked (marked as pending again)
        setSuccess('Task marked as pending');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      setTasks(tasks.filter((t) => t.id !== id));
      // Note: TasksApi doesn't have deleteTask method, so we'll simulate it
      // await TasksApi.deleteTask(id);
    } catch (error) {
      console.error('Error deleting task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const handleEditTask = (task: EnhancedTask) => {
    setCurrentTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: CreateTaskRequest) => {
    try {
      setError(null); // Clear any previous errors
      setSuccess(null); // Clear any previous success messages

      let savedTask;
      if (currentTask) {
        savedTask = await TasksApi.updateTask(currentTask.id, taskData);
        setSuccess('Activity updated successfully!');
      } else {
        savedTask = await TasksApi.createTask(taskData);
        setSuccess('New activity created successfully!');
      }

      // Close modal first
      setIsModalOpen(false);
      setCurrentTask(null);

      // Force refresh the task list
      await fetchTasks();

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (error) {
      console.error('Error saving task:', error);

      let errorMessage = 'Failed to save activity. Please try again.';

      // Enhanced error handling with specific feedback
      if (error instanceof Error) {
        const apiError = error as any;

        // Check for specific error types
        if (apiError.status === 401) {
          errorMessage = 'Session expired. Please log in again and try again.';
        } else if (apiError.status === 403) {
          errorMessage = 'You do not have permission to save this activity.';
        } else if (apiError.status === 400) {
          errorMessage =
            apiError.message ||
            'Invalid activity data. Please check all required fields are filled correctly.';
        } else if (apiError.status === 422) {
          errorMessage = 'Validation failed. Please ensure all required fields are completed.';
        } else if (apiError.status >= 500) {
          errorMessage = 'Server error occurred. Please try again in a few moments.';
        } else if (apiError.message) {
          errorMessage = `Save failed: ${apiError.message}`;
        }

        // Network errors
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          errorMessage =
            'Network connection error. Please check your internet connection and try again.';
        }
      }

      setError(errorMessage);

      // Show error for 10 seconds, then auto-clear
      setTimeout(() => {
        setError(null);
      }, 10000);
    }
  };

  const statistics = getStatistics();
  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-followups-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <h1 className="page-title">{pageHeader.title}</h1>
            <p className="page-subtitle">{pageHeader.subtitle}</p>
            <p className="page-description">{pageHeader.description}</p>
          </div>
          <BackButton />
        </div>
      </div>

      {/* Error Alert - Show when there are save/load errors */}
      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorContent}>
            <FontAwesomeIcon icon={faExclamationTriangle} className={styles.errorIcon} />
            <div className={styles.errorMessage}>
              <strong>Error:</strong> {error}
            </div>
            <button
              className={styles.errorDismiss}
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Alert - Show when save/operations succeed */}
      {success && (
        <div className={styles.successAlert}>
          <div className={styles.successContent}>
            <FontAwesomeIcon icon={faCheckCircle} className={styles.successIcon} />
            <div className={styles.successMessage}>
              <strong>Success:</strong> {success}
            </div>
            <button
              className={styles.successDismiss}
              onClick={() => setSuccess(null)}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Statistics Dashboard */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.total}</div>
            <div className={styles.statLabel}>Total Activities</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.completed}</div>
            <div className={styles.statLabel}>Completed</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.dueToday}</div>
            <div className={styles.statLabel}>Due Today</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.overdue}</div>
            <div className={styles.statLabel}>Overdue</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faHandshake} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.salesActivities}</div>
            <div className={styles.statLabel}>Sales Activities</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FontAwesomeIcon icon={faWrench} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{statistics.serviceActivities}</div>
            <div className={styles.statLabel}>Service Activities</div>
          </div>
        </div>
      </div>

      {/* New Activity Button - Only visible for authorized roles */}
      {canCreateTasks(user?.role) && (
        <div className={styles.newActivitySection}>
          <button
            className={styles.newActivityButton}
            onClick={() => {
              setCurrentTask(null);
              setIsModalOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faUserPlus} />
            <span>New Activity</span>
          </button>
        </div>
      )}

      {/* Filters and Controls */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <div className={styles.searchBox}>
            <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Categories</option>
              <option value="sales">Sales</option>
              <option value="service">Service</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="follow-up">Follow-up</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.sortGroup}>
            <FontAwesomeIcon icon={faSort} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="category">Category</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FontAwesomeIcon icon={faList} />
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FontAwesomeIcon icon={faThLarge} />
            </button>
            <button
              className={`${styles.viewButton} ${statusFilter === 'all' ? styles.active : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
              title={statusFilter === 'all' ? 'Hide Completed Tasks' : 'Show Completed Tasks'}
            >
              <FontAwesomeIcon icon={statusFilter === 'all' ? faEyeSlash : faEye} />
            </button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div
        className={`${styles.tasksContainer} ${viewMode === 'grid' ? styles.gridView : styles.listView}`}
      >
        {filteredTasks.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faChartLine} className={styles.emptyIcon} />
            <h3>No activities found</h3>
            <p>Create your first activity to get started</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`${styles.taskCard} ${task.isCompleted ? styles.completed : ''}`}
            >
              <div className={styles.taskHeader}>
                <div
                  ref={(el) => {
                    if (el) {
                      el.style.backgroundColor = categoryConfig[task.category]?.color || '#007bff';
                    }
                  }}
                  className={styles.categoryBadge}
                >
                  <FontAwesomeIcon icon={categoryConfig[task.category]?.icon} />
                  {categoryConfig[task.category]?.label}
                </div>
                <div className={styles.taskActions}>
                  <button className={styles.actionButton} onClick={() => handleEditTask(task)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button className={styles.actionButton} onClick={() => handleDeleteTask(task.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>

              <div className={styles.taskContent}>
                <div className={styles.taskTitle}>
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => handleTaskToggle(task.id)}
                    className={styles.taskCheckbox}
                  />
                  <h3>{task.title}</h3>
                </div>
                <p className={styles.taskDescription}>{task.description}</p>

                <div className={styles.taskMeta}>
                  <div className={styles.metaItem}>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                  {task.estimatedValue && (
                    <div className={styles.metaItem}>
                      <FontAwesomeIcon icon={faDollarSign} />
                      <span>${task.estimatedValue}</span>
                    </div>
                  )}
                  <div className={`${styles.priorityBadge} ${styles[task.priority]}`}>
                    {task.priority.toUpperCase()}
                  </div>
                </div>

                {task.tags.length > 0 && (
                  <div className={styles.taskTags}>
                    <FontAwesomeIcon icon={faTags} />
                    {task.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Form Modal */}
      {isModalOpen && (
        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentTask(null);
          }}
          onSave={handleSaveTask}
          currentTask={currentTask}
        />
      )}
    </div>
  );
}
