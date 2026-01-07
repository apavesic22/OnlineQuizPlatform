import { Component, OnInit } from '@angular/core';
import { QuizzesService } from '../../services/quizzesService';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatCardModule, MatIconModule],
  templateUrl: './leaderboard-page.html',
  styleUrls: ['./leaderboard-page.scss']
})
export class LeaderboardPage implements OnInit {
  // Columns to display in the table
  displayedColumns: string[] = ['rank', 'username', 'score'];
  dataSource: any[] = [];
  currentUser: any = null;

  constructor(private quizzesService: QuizzesService) {}

  ngOnInit() {
    this.quizzesService.getGlobalLeaderboard().subscribe({
      next: (res) => {
        this.dataSource = res.top10;
        this.currentUser = res.currentUser;
      },
      error: (err) => console.error('Could not load leaderboard', err)
    });
  }
}