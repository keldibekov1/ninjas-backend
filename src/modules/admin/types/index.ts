export type AdminInfo = {
  id: number;
  name: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: number;
    permissions: {
      id: number;
      name: string | null;
      accessibility: string[];
    }[];
  };
};
