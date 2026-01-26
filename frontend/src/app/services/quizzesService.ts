import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuizQuestion } from '../models/quiz-question';

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
  
  createQuiz(quizData: any): Observable<any> {
    return this.http.post(this.apiUrl, quizData);
  }

}
