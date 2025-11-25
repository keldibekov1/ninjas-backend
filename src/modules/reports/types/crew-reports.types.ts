export interface CrewReportFilters {
  page?: number;
  limit?: number;
  crewId?: number;
  from_date?: string;
  to_date?: string;
  includeCompletedOnly?: boolean;
}

export interface CrewMember {
  workerId: number;
  workerName: string;
  isLeader: boolean;
}

export interface TaskSummary {
  id: number;
  description: string;
  isCompleted: boolean;
  completedDate: Date | null;
  timeSpent: number;
}

export interface ExpenseSummary {
  total: number;
  spending: number;
  penalties: number;
}

export interface WorkOrderSummary {
  reportId: number;
  woNumber: string;
  status: string;
  address: string;
  startDate: Date | null;
  completedDate: Date | null;
  totalHours: number;
  tasks: TaskSummary[];
  expenses: ExpenseSummary;
}

export interface PeriodSummary {
  startDate: Date | null;
  endDate: Date | null;
  daysActive: number;
}

export interface CrewWorkSummary {
  crewId: number;
  crewName: string;
  members: CrewMember[];
  workOrders: WorkOrderSummary[];
  totalHours: number; // Sum of all crew member shift hours
  totalWorkOrders: number;
  completedWorkOrders: number;
  totalCost: number; // Total cost from work order expenses
  taskTotalSpentTime: number; // Combined task time from all crew members
}

export interface CrewReportResponse {
  total: number;
  page: number;
  limit: number;
  data: CrewWorkSummary[];
  summary: {
    totalCrews: number;
    totalWorkOrders: number;
    totalCompletedOrders: number;
    totalShiftHours: number; // Sum of all shift hours across all crews
    totalTaskSpentTime: number; // Sum of all task time across all crews
    totalCost: number;
  };
}

export interface ProductivityMetrics {
  ordersPerMember: number;
  completedOrdersPerMember: number;
}

export interface CrewPerformanceMetrics {
  crewId: number;
  crewName: string;
  memberCount: number;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  averageCompletionDays: number;
  productivity: ProductivityMetrics;
}