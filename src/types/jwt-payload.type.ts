export interface JwtPayloadType {
    info: {
      id: number;
      role: string;
      type: 'global_admin' | 'admin' | 'worker' | 'tenant_user';
    };
  }