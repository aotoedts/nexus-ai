export type AgentRunStatus = 
  | 'idle'
  | 'planning'
  | 'running'
  | 'awaiting_authorization'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface AgentStep {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export interface AgentRun {
  id: string;
  conversationId: string;
  status: AgentRunStatus;
  objective: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  
  steps: AgentStep[];
  currentStepIndex: number;
  
  pendingAuthorization?: {
    stepId: string;
    prompt: string;
    action: string;
    details?: Record<string, any>;
  };
  
  result?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  
  totalDuration?: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

export interface AgentRunResponse {
  agentRun: AgentRun;
}
