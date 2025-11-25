export const PERMISSIONS = [
  {
    id: 1,
    name: 'DASHBOARD',
    allowedAccesses: ['READ', 'WRITE'],
  },
  {
    id: 2,
    name: 'WORK_ORDER',
    allowedAccesses: ['READ', 'EDIT'],
  },
  {
    id: 3,
    name: 'ADMINS_MANAGEMENT',
    allowedAccesses: ['CREATE', 'READ', 'EDIT', 'DELETE'],
  },
  {
    id: 4,
    name: 'WORKERS_MANAGEMENT',
    allowedAccesses: ['CREATE', 'READ', 'EDIT', 'DELETE'],
  },
  {
    id: 5,
    name: 'PRICE',
    allowedAccesses: ['READ'],
  },
  {
    id: 6,
    name: 'TASK',
    allowedAccesses: ['READ', 'EDIT'],
  },
];
