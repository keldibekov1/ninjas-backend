export type TaskType = {
  report_id?: number;
  tenantId?: number;
  desc: string;
  qty: number;
  price: number;
  total: number;
  add: string;
  createdAt?: Date;
  updatedAt?: Date;
};
