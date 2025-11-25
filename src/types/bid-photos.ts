export interface BidPhoto {
    id: number;
    url: string;
    filename: string;
    taskItem: string;
    orderId: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export type TaskItemType = 
    | 'exterior-inspection'
    | 'remove-debris'
    | 'remove-vines'
    | 'replace-garage-door';