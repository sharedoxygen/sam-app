import { useState, useEffect } from 'react';
import {
  SaveStatus,
  WeeklyMetrics,
  AgentPerformance,
  TeamPerformance,
  ViewMode,
  TeamViewMode,
  CurrentView,
} from '@/lib/weekly-performance/types';
import { getWeekDates, canViewTeamAnalytics } from '@/lib/weekly-performance/utils';
import { useAuth } from '@/lib/auth/AuthContext';

export function useWeeklyPerformance() {
  const { user } = useAuth();

  // State management
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('comparison');
  const [teamViewMode, setTeamViewMode] = useState<TeamViewMode>('team');
  const [currentView, setCurrentView] = useState<CurrentView>('personal');

  // Performance data
  const [individualPerformance, setIndividualPerformance] = useState<AgentPerformance | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [editingAgent, setEditingAgent] = useState<AgentPerformance | null>(null);
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showAgentDetailModal, setShowAgentDetailModal] = useState(false);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<AgentPerformance | null>(null);

  // Computed values
  const hasTeamAccess = canViewTeamAnalytics(user?.role);
  const { startDate, endDate, startDateShort, endDateShort, weekStartDate } =
    getWeekDates(weekOffset);
  const isCurrentWeek = () => weekOffset === 0;

  // Navigation functions
  const navigateWeek = (direction: number) => {
    setWeekOffset((prev) => prev + direction);
    loadWeekData(weekOffset + direction);
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
    loadWeekData(0);
  };

  const goToSeedWeek = () => {
    // Calculate weeks between now and Jan 2, 2025
    const seedStartDate = new Date(2025, 0, 2); // January 2, 2025 (month is 0-indexed)
    const currentWeekStart = new Date();
    const currentDay = currentWeekStart.getDay();
    const currentDiff = currentWeekStart.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    currentWeekStart.setDate(currentDiff);
    currentWeekStart.setHours(0, 0, 0, 0);

    const timeDiff = seedStartDate.getTime() - currentWeekStart.getTime();
    const weeksDiff = Math.round(timeDiff / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(weeksDiff);
    loadWeekData(weeksDiff);
  };

  // Modal functions
  const openForecastEditor = (agent: AgentPerformance) => {
    setEditingAgent({ ...agent });
    setShowForecastModal(true);
  };

  const closeForecastEditor = () => {
    setEditingAgent(null);
    setShowForecastModal(false);
  };

  const openAgentDetailModal = (agent: AgentPerformance) => {
    setSelectedAgentDetails(agent);
    setShowAgentDetailModal(true);
  };

  const closeAgentDetailModal = () => {
    setSelectedAgentDetails(null);
    setShowAgentDetailModal(false);
  };

  // Update editing agent's forecast
  const updateEditingForecast = (field: keyof WeeklyMetrics, value: number) => {
    if (!editingAgent) return;

    setEditingAgent({
      ...editingAgent,
      forecast: {
        ...editingAgent.forecast,
        [field]: value,
      },
    });
  };

  // Load week data - always load personal data, conditionally load team data
  const loadWeekData = async (offset: number) => {
    if (!user?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { weekStartDate } = getWeekDates(offset);

      // Always load personal performance data for the logged-in user
      const personalResponse = await fetch(
        `/api/weekly-performance?weekStartDate=${weekStartDate}&userId=${user.id}`
      );

      if (!personalResponse.ok) {
        throw new Error('Failed to fetch personal performance data');
      }

      const personalData = await personalResponse.json();

      setIndividualPerformance({
        userId: String(user.id),
        userName: user.name || user.username,
        userRole: user.role,
        forecast: personalData.forecast,
        actual: personalData.actual,
        performanceMetrics: personalData.performanceMetrics,
      });

      // If user has team access, also load team performance data
      if (hasTeamAccess) {
        const teamResponse = await fetch(
          `/api/weekly-performance/team?weekStartDate=${weekStartDate}&managerId=${user.id}`
        );

        if (!teamResponse.ok) {
          throw new Error('Failed to fetch team performance data');
        }

        const teamData = await teamResponse.json();
        setTeamPerformance(teamData);
      }

      setLastSaved(new Date().toISOString());
    } catch (err) {
      setError('Failed to load weekly performance data');
      console.error('Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save forecast data
  const saveForecast = async (forecast: WeeklyMetrics, agentId?: string) => {
    if (!user?.id) {
      setSaveStatus('error');
      setError('User not authenticated. Please log in again.');
      return;
    }

    setSaveStatus('saving');
    setError(null);

    try {
      const { weekStartDate } = getWeekDates(weekOffset);
      const targetUserId = agentId || user.id;

      const response = await fetch('/api/weekly-forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId,
          weekStartDate,
          forecast,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save failed with status:', response.status, 'Error:', errorText);
        throw new Error(`Failed to save forecast: ${response.status} ${errorText}`);
      }

      setLastSaved(new Date().toISOString());
      setSaveStatus('saved');

      // Reload data to reflect changes
      loadWeekData(weekOffset);

      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Save error:', err);

      if (err instanceof Error && err.message.includes('401')) {
        setError('Session expired. Please log in again.');
      } else if (err instanceof Error && err.message.includes('403')) {
        setError('Insufficient permissions. You can only edit your own forecasts.');
      } else {
        setError('Failed to save forecast data. Please try again.');
      }
    }
  };

  // Save agent's forecast
  const saveAgentForecast = async () => {
    if (!editingAgent) return;
    await saveForecast(editingAgent.forecast, editingAgent.userId);
    closeForecastEditor();
  };

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      loadWeekData(weekOffset);
    }
  }, [user?.id, weekOffset]);

  // Set default view modes
  useEffect(() => {
    setViewMode('comparison');
    setTeamViewMode('team');
    setCurrentView('personal'); // Always start with personal view
  }, []);

  return {
    // State
    weekOffset,
    isLoading,
    saveStatus,
    lastSaved,
    error,
    viewMode,
    teamViewMode,
    currentView,
    individualPerformance,
    teamPerformance,
    editingAgent,
    showForecastModal,
    showAgentDetailModal,
    selectedAgentDetails,

    // Computed values
    hasTeamAccess,
    startDate,
    endDate,
    startDateShort,
    endDateShort,
    weekStartDate,
    isCurrentWeek,

    // Actions
    setViewMode,
    setTeamViewMode,
    setCurrentView,
    setIndividualPerformance,
    navigateWeek,
    goToCurrentWeek,
    goToSeedWeek,
    openForecastEditor,
    closeForecastEditor,
    openAgentDetailModal,
    closeAgentDetailModal,
    updateEditingForecast,
    loadWeekData,
    saveForecast,
    saveAgentForecast,
  };
}
