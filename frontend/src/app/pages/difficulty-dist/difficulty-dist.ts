import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-difficulty-dist',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div style="padding: 20px; display: flex; justify-content: center;">
      <mat-card style="width: 100%; max-width: 500px; padding: 20px;">
        <mat-card-header>
          <mat-card-title>Quiz Difficulty Distribution</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <canvas id="difficultyPieChart"></canvas>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DifficultyDistComponent implements OnInit {
  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<{label: string, count: number}[]>('/api/quizzes/difficulty-stats')
      .subscribe(data => {
        this.createChart(data);
      });
  }

  createChart(stats: any[]) {
    const ctx = document.getElementById('difficultyPieChart') as HTMLCanvasElement;
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: stats.map(s => s.label),
        datasets: [{
          data: stats.map(s => s.count),
          backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}