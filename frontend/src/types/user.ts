export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

export interface UserSearchResponse {
  users: User[];
  total: number;
}

export interface UserSearchParams {
  query: string;
  page?: number;
  limit?: number;
} 