import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { DatePipe, CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';

export interface PersonalStats {
  quiz_name: string;
  your_score: number;      
  correct_answers: number; 
  total_questions: number; 
  category_name: string;
  finished_at: string;
}

@Component({
  selector: 'app-my-stats',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, DatePipe],
  templateUrl: './my-stats.html',
  styleUrls: ['./my-stats.scss']
})
export class MyStatsComponent implements OnInit {
  displayedColumns: string[] = ['name', 'category', 'score', 'accuracy', 'date'];
  dataSource: PersonalStats[] = [];
  chart: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<PersonalStats[]>('/api/quizzes/my-stats').subscribe((data) => {
      this.dataSource = data;
      if (data && data.length > 0) {
        setTimeout(() => this.createChart(), 100);
      }
    });
  }

  createChart() {
    const ctx = document.getElementById('performanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const labels = this.dataSource.map(d => new Date(d.finished_at).toLocaleDateString());
    
    
    const accuracyData = this.dataSource.map(d => {
      const total = d.total_questions > 0 ? d.total_questions : 1;
      const percentage = (d.correct_answers / total) * 100;
      return Math.round(percentage); 
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Success Rate (%)',
          data: accuracyData,
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 6,
          pointBackgroundColor: '#3f51b5'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { 
            beginAtZero: true, 
            max: 110, 
            ticks: {
              stepSize: 20,
              callback: (value: string | number) => {

          const numValue = typeof value === 'number' ? value : parseFloat(value);

          return numValue <= 100 ? numValue + '%' : '';

        }
            },
            title: { display: true, text: 'Accuracy (%)' }
          }
        }
      }
    });
  }
}