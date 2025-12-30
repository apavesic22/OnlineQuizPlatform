import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'play-quiz-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './play-quiz.html',
  styleUrls: ['./play-quiz.scss']
})
export class PlayQuizPage implements OnInit, OnDestroy {
  quizId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.quizId = Number(this.route.snapshot.paramMap.get('quizId'));
    console.log('Playing quiz', this.quizId);
  }

  ngOnDestroy(): void {}
}
