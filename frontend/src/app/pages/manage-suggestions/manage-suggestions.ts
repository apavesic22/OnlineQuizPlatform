import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-manage-suggestions',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDivider,
  ],
  templateUrl: './manage-suggestions.html',
  styleUrls: ['./manage-suggestions.scss'],
})
export class ManageSuggestionsPage implements OnInit {
  suggestions: any[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadSuggestions();
  }

  loadSuggestions() {
    this.loading = true;
    this.http.get<any[]>('/api/suggestions').subscribe({
      next: (data) => {
        this.suggestions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch', err);
        this.loading = false;
      },
    });
  }
  updateStatus(
    suggestion: any,
    newStatus: 'approved' | 'rejected' | 'pending'
  ) {
    this.http
      .patch(`/api/suggestions/${suggestion.suggestion_id}/status`, {
        status: newStatus,
      })
      .subscribe({
        next: () => {
          suggestion.status = newStatus;
          console.log(
            `Successfully updated suggestion ${suggestion.suggestion_id} to ${newStatus}`
          );
        },
        error: (err) => {
          console.error('Failed to update status in database', err);
        },
      });
  }
}
