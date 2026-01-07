import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Quiz } from '../models/quiz';
import { QuizQuestion } from '../models/quiz-question';

interface QuizResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: Quiz[];
}

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private apiUrl = '/api/quizzes';

  constructor(private http: HttpClient) {}

  getQuizzes(page: number = 1) {
    return this.http.get<any>(`${this.apiUrl}?page=${page}&limit=10`);
  }

  getQuizQuestions(quizId: number): Observable<QuizQuestion[]> {
    return this.http.get<QuizQuestion[]>(`${this.apiUrl}/${quizId}/questions`);
  }

  submitAnswers(
    quizId: number,
    answers: { question_id: number; answer_id: number }[]
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${quizId}/submit`, { answers });
  }

  getDifficulties(): Observable<any[]> {
    return this.http.get<any[]>('/api/quizzes/difficulties');
  }

  createQuiz(quizData: any): Observable<any> {
    return this.http.post(this.apiUrl, quizData);
  }

  getGlobalLeaderboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/global-leaderboard`);
  }
}
