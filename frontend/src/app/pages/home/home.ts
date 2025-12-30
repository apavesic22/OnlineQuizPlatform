import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { QuizzesService } from '../../services/quizzes';
import { Quiz } from '../../models/quiz';

@Component({
  selector: 'home-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomePage implements OnInit {
  quizzes: Quiz[] = [];
  loading = true;

  constructor(private quizzesService: QuizzesService) {}

  ngOnInit(): void {
    this.quizzesService.getQuizzes().subscribe({
      next: res => {
        this.quizzes = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
