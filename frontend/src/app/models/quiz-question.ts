export interface QuizAnswer {
  answer_id: number;
  answer_text: string;
  is_correct: number; 
}

export interface QuizQuestion {
  question_id: number;
  question_text: string;
  time_limit: number;
  type: string;
  answers: QuizAnswer[];
}
