import { useState, useEffect } from 'react';
import { Agent } from '../utils/roleHelpers';
import { UserApi } from '@/lib/api/apiService';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const data = await UserApi.getUsers();
      setAgents(data as Agent[]);
      setError('');
    } catch (error) {
      setError('Error loading agents. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId: number) => {
    try {
      await UserApi.deleteUser(agentId);
      await fetchAgents(); // Refresh the list
      return { success: true, message: 'Agent deleted successfully' };
    } catch (error) {
      console.error(error);
      return { success: false, message: 'Error deleting agent. Please try again.' };
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    loading,
    error,
    setError,
    fetchAgents,
    deleteAgent,
  };
};
