import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SyncStatus {
  tenantId: number;
  status: 'running' | 'completed' | 'failed';
  spentTime?: string;
  error?: string;
}

@Injectable()
export class OrdersSyncService {
  private syncStatus = new Map<number, Subject<SyncStatus>>();

  getSyncSubject(tenantId: number): Subject<SyncStatus> {
    if (!this.syncStatus.has(tenantId)) {
      this.syncStatus.set(tenantId, new Subject<SyncStatus>());
    }
    return this.syncStatus.get(tenantId);
  }

  async startSync(tenantId: number): Promise<void> {
    const subject = this.getSyncSubject(tenantId);
    subject.next({ tenantId, status: 'running' });
  }

  async completedSync(tenantId: number, spentTime: string): Promise<void> {
    const subject = this.getSyncSubject(tenantId);
    subject.next({ tenantId, status: 'completed', spentTime });
  }

  async failedSync(tenantId: number, error: string): Promise<void> {
    const subject = this.getSyncSubject(tenantId);
    subject.next({ tenantId, status: 'failed', error });
  }

  clearSync(tenantId: number): void {
    const subject = this.syncStatus.get(tenantId);
    if (subject) {
      subject.complete();
      this.syncStatus.delete(tenantId);
    }
  }
}