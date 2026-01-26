import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Leaderboard {
  top10: LeaderboardPlayer[];
  currentUser: LeaderboardPlayer | null;
}

export interface LeaderboardPlayer {
  user_id: number;
  username: string;
  total_score: number;
  rank: number;
}


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) { }

  getLeaderboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/leaderboard`);
  }
}
