export interface User {
  user_id: number;
  username: string;
  roles?: number[];
  total_score?: number;
  rank?: number;
  role_id: number;
  verified: number;
  email: string;
}
