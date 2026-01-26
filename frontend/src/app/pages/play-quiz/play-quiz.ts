import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { interval, Subscription } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { QuizzesService } from '../../services/quizzesService';
import { QuizQuestion, QuizAnswer } from '../../models/quiz-question';
import { AuthService } from '../../services/authService';
import { User } from '../../models/user';
import { LeaderboardComponent } from '../../components/leaderboard/leaderboard';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'play-quiz-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatProgressBarModule,
    LeaderboardComponent,
    RouterModule,
  ],
  templateUrl: './play-quiz.html',
  styleUrls: ['./play-quiz.scss'],
})
export class PlayQuizPage implements OnInit, OnDestroy {
  quizId!: number;

  questions: QuizQuestion[] = [];
  currentIndex = 0;
  currentQuestion!: QuizQuestion;

  loading = true;

  timeLeft = 15;
  timerSub?: Subscription;
  answered = false;
  selectedAnswerId?: number;

  correctCount = 0;
  wrongCount = 0;
  quizFinished = false;
  finalScore = 0;
  leaderboardData: any = null;
  currentUserStats: any = null;

  user: User | null = null;
  userAnswers: { question_id: number; answer_id: number, is_correct: boolean}[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizzesService: QuizzesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });

    this.quizId = Number(this.route.snapshot.paramMap.get('quizId'));

    this.quizzesService.getQuizQuestions(this.quizId).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.currentQuestion = this.questions[0];
        this.loading = false;
        this.startTimer();
      },
      error: () => {
        alert('Failed to load quiz');
        this.router.navigate(['/']);
      },
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }


  startTimer() {
    this.stopTimer();
    this.timeLeft = this.currentQuestion.time_limit || 15;

    this.timerSub = interval(1000).subscribe(() => {
      this.timeLeft--;

      if (this.timeLeft <= 0) {
        this.handleTimeout();
      }
    });
  }

  stopTimer() {
    this.timerSub?.unsubscribe();
  }


  selectAnswer(answer: QuizAnswer) {
    if (this.answered) return;

    this.answered = true;
    this.selectedAnswerId = answer.answer_id;
    this.stopTimer();

    const isCorrect = answer.is_correct === 1;

    this.userAnswers.push({
      question_id: this.currentQuestion.question_id,
      answer_id: answer.answer_id,
      is_correct: isCorrect,
    });

    if (isCorrect) {
      this.correctCount++;
    } else {
      this.wrongCount++;
    }

    setTimeout(() => this.nextQuestion(), 1200);
  }

  handleTimeout() {
    if (this.answered) return;

    this.answered = true;
    this.wrongCount++;
    this.stopTimer();

    setTimeout(() => this.nextQuestion(), 1200);
  }


  nextQuestion() {
    this.answered = false;
    this.selectedAnswerId = undefined;

    this.currentIndex++;

    if (this.currentIndex >= this.questions.length) {
      this.finishQuiz();
      return;
    }

    this.currentQuestion = this.questions[this.currentIndex];
    this.startTimer();
  }

  finishQuiz() {
    this.stopTimer();
    this.quizFinished = true;
    if (!this.user) {
      alert(
        `Quiz finished!\n\nCorrect: ${this.correctCount}\nIncorrect: ${this.wrongCount}`
      );
      this.router.navigate(['/quizzes']);
    } else {
      this.quizzesService
        .submitAnswers(this.quizId, this.userAnswers)
        .subscribe({
          next: (result) => {
            this.finalScore = result.score;
            this.correctCount = result.correctAnswers;
            this.wrongCount = result.incorrectAnswers;
            this.leaderboardData = result.leaderboard;
            this.currentUserStats = result.currentUserStats;
          },
          error: (err) => {
            console.error(err);
            alert('There was an error submitting your answers.');
          },
        });
    }
  }


  isCorrect(answer: QuizAnswer): boolean {
    return answer.is_correct === 1;
  }

  isSelected(answer: QuizAnswer): boolean {
    return this.selectedAnswerId === answer.answer_id;
  }

  get progressValue(): number {
    const total = this.currentQuestion?.time_limit ?? 15;
    return (this.timeLeft / total) * 100;
  }
}
