export interface Quiz {
  quiz_id: number;
  quiz_name: string;
  question_count: number;
  duration: number;
  is_customizable: number;
  created_at: string;
  category_name: string;
  difficulty: string;
  creator: string;
  likes: number;
  user_has_liked: boolean;
}
