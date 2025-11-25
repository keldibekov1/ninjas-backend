const VALID_TASK_ITEMS = [
    'exterior-inspection',
    'remove-debris',
    'remove-vines',
    'replace-garage-door'
  ] as const;
  
  export type TaskItem = typeof VALID_TASK_ITEMS[number];
  
  export function validateTaskItem(taskItem: string): taskItem is TaskItem {
    return VALID_TASK_ITEMS.includes(taskItem as TaskItem);
  }