import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, Leaderboard } from '../../services/userService';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
  styleUrls: ['./leaderboard.scss']
})
export class LeaderboardComponent implements OnInit {
  leaderboard: Leaderboard | null = null;
  loading = true;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.getLeaderboard().subscribe({
      next: (data) => {
        this.leaderboard = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load leaderboard', err);
        this.loading = false;
      }
    });
  }
}
