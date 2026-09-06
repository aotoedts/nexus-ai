import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentRun, AgentRunStatus } from '../types/agent';

interface UseAgentRunOptions {
  token: string;
  baseURL?: string;
  pollInterval?: number;
}

interface UseAgentRunReturn {
  agentRun: AgentRun | null;
  isLoading: boolean;
  error: string | null;
  
  startAgent: (conversationId: string, objective: string) => Promise<AgentRun>;
  authorizeStep: (runId: string, stepId: string, authorized: boolean) => Promise<AgentRun>;
  cancelAgent: (runId: string) => Promise<void>;
  fetchStatus: (runId: string) => Promise<AgentRun>;
  clearAgent: () => void;
}

export const useAgentRun = (options: UseAgentRunOptions): UseAgentRunReturn => {
  const { token, baseURL = 'https://nexus-backend-xu40.onrender.com', pollInterval = 2000 } = options;
  
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const makeRequest = useCallback(async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: any
  ) => {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      return response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, [token, baseURL]);

  const startAgent = useCallback(async (conversationId: string, objective: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await makeRequest('/api/v1/agents/run', 'POST', {
        conversationId,
        goal: objective,
      });
      
      setAgentRun(data.agentRun);
      
      if (data.agentRun.status === 'planning' || data.agentRun.status === 'running') {
        startPolling(data.agentRun.id);
      }
      
      return data.agentRun;
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const fetchStatus = useCallback(async (runId: string) => {
    try {
      const data = await makeRequest(`/api/v1/agents/run/${runId}`, 'GET');
      setAgentRun(data.agentRun);
      
      if (!['planning', 'running', 'awaiting_authorization'].includes(data.agentRun.status)) {
        stopPolling();
      }
      
      return data.agentRun;
    } catch (err) {
      setAgentRun(null);
      throw err;
    }
  }, [makeRequest]);

  const authorizeStep = useCallback(async (runId: string, stepId: string, authorized: boolean) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await makeRequest(`/api/v1/agents/run/${runId}/authorize`, 'POST', {
        stepId,
        authorized,
      });
      
      setAgentRun(data.agentRun);
      
      if (data.agentRun.status === 'running') {
        startPolling(runId);
      }
      
      return data.agentRun;
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const cancelAgent = useCallback(async (runId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await makeRequest(`/api/v1/agents/run/${runId}`, 'PUT', {
        action: 'cancel',
      });
      
      stopPolling();
      setAgentRun(null);
    } finally {
      setIsLoading(false);
    }
  }, [makeRequest]);

  const startPolling = useCallback((runId: string) => {
    stopPolling();
    
    pollingInterval.current = setInterval(() => {
      fetchStatus(runId).catch(() => {});
    }, pollInterval);
  }, [pollInterval, fetchStatus]);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  const clearAgent = useCallback(() => {
    stopPolling();
    setAgentRun(null);
    setError(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    agentRun,
    isLoading,
    error,
    startAgent,
    authorizeStep,
    cancelAgent,
    fetchStatus,
    clearAgent,
  };
};
