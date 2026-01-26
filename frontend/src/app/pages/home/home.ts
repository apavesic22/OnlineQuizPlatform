import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { QuizzesService } from '../../services/quizzesService';
import { HttpClient } from '@angular/common/http';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../services/authService';
import { Subscription } from 'rxjs';
import { User } from '../../models/user';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AdminQuizEditDialog } from '../../dialogs/edit-quiz-dialog/edit-quiz-dialog';
@Component({
  selector: 'home-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    RouterModule,
    MatIcon,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomePage implements OnInit {
  quizzes: any[] = [];
  loading = true;
  isLoggedIn = false;
  user: User | null = null;
  private authSub!: Subscription;

  // Pagination variables
  currentPage = 1;
  totalPages = 1;
  pages: number[] = [];

  constructor(
    private quizzesService: QuizzesService,
    private http: HttpClient,
    private authService: AuthService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  openEditDialog(quizId: number): void {
    const dialogRef = this.dialog.open(AdminQuizEditDialog, {
      width: '800px',
      maxHeight: '90vh',
      data: { quiz_id: quizId },
      panelClass: 'glass-dialog', 
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadQuizzes(this.currentPage);
      }
    });
  }

  ngOnInit(): void {
    this.authSub = this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      this.isLoggedIn = !!user;
    });
    this.loadQuizzes();
  }

  deleteQuiz(quiz: any): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${quiz.quiz_name}"? This action cannot be undone.`,
    );

    if (confirmed) {
      this.http.delete(`/api/quizzes/${quiz.quiz_id}`).subscribe({
        next: () => {
          this.snack.open('Quiz deleted successfully', 'Close', {
            duration: 3000,
          });
          this.quizzes = this.quizzes.filter((q) => q.quiz_id !== quiz.quiz_id);
        },
        error: (err) => {
          this.snack.open('Error deleting quiz', 'Close', { duration: 3000 });
          console.error(err);
        },
      });
    }
  }

  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  clearLocalLikes(): void {
    this.quizzes = this.quizzes.map((quiz) => ({
      ...quiz,
      user_has_liked: 0,
    }));
  }

  checkLoginStatus(): void {
    this.http.get('/api/auth/').subscribe({
      next: (user) => {
        this.isLoggedIn = !!user;
      },
      error: () => {
        this.isLoggedIn = false;
      },
    });
  }

  loadQuizzes(page: number = 1): void {
    this.loading = true;
    this.currentPage = page;

    this.quizzesService.getQuizzes(this.currentPage).subscribe({
      next: (res) => {
        this.quizzes = res.data;

        if (!this.isLoggedIn) {
          this.clearLocalLikes();
        }

        this.totalPages = res.totalPages;
        this.generatePageNumbers();
        this.loading = false;
        window.scrollTo(0, 0);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  generatePageNumbers(): void {
    this.pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      this.pages.push(i);
    }
  }

  toggleLike(quiz: any) {
    if (!this.isLoggedIn) return;

    this.http
      .post<any>(`/api/quizzes/${quiz.quiz_id}/like`, {})
      .subscribe((res) => {
        quiz.user_has_liked = res.liked ? 1 : 0;
        quiz.likes = res.liked ? (quiz.likes || 0) + 1 : (quiz.likes || 1) - 1;
      });
  }
}
