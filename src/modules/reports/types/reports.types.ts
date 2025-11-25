export interface WorkerReport {
    id: number;
    name: string;
    daily_pay_rate: number;
    extra_hourly_rate: number;
    assignments: Assignment[];
    completedTasks: CompletedTask[];
    shiftTimeRecords: ShiftTimeRecord[];
    earnings: Earning[];
  }
  
  export interface Assignment {
    order: {
      id: number;
      report_id: number;
      wo_status: string;
      completed_date: string | null;
      wo_number: string | null;
    };
  }
  
  export interface CompletedTask {
    id: number;
    report_id: number;
    qty: number;
    price: number;
    total: number;
    isCompleted: boolean;
    completedWorker: number | null;
    completedDate: string | null;
    desc: string | null;
    TaskTimeRecords: TaskTimeRecord[];
  }
  
  export interface TaskTimeRecord {
    id: number;
    task_id: number;
    start_time: number;
    end_time: number;
    spent_time: number | null;
  }
  
  export interface ShiftTimeRecord {
    id: number;
    worker_id: number;
    date: string;
    clockin_time: number;
    finishjob_time: number;
    clockout_time: number;
  }
  
  export interface Earning {
    id: number;
    workerId: number | null;
    amount: number;
    action: string | null;
    comment: string | null;
    date: string;
  }
  