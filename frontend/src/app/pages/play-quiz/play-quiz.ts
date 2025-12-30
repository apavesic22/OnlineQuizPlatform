import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

import { QuizzesService } from '../../services/quizzes';
import { QuizQuestion } from '../../models/quiz-question';

@Component({
  selector: 'play-quiz-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './play-quiz.html',
  styleUrls: ['./play-quiz.scss']
})
export class PlayQuizPage implements OnInit, OnDestroy {
  quizId!: number;

  questions: QuizQuestion[] = [];
  currentIndex = 0;
  currentQuestion?: QuizQuestion;

  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizzesService: QuizzesService
  ) {}

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('quizId'));

    this.quizzesService.getQuizQuestions(this.quizId).subscribe({
      next: questions => {
        this.questions = questions;
        this.currentQuestion = this.questions[0];
        this.loading = false;
      },
      error: () => {
        alert('Failed to load quiz');
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy(): void {}
}
