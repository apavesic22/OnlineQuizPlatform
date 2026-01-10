import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './services/auth';
import { LoginDialog } from './dialogs/login/login';
import { SuggestionDialogComponent } from './dialogs/suggestions/suggestions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  title = 'Quizify';
  user: any = null;
  loading = true;
  isLoggedIn = false; // Added property to track login state explicitly

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient
  ) {
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
      this.isLoggedIn = !!user; // Automatically set true if user exists, false if null
      console.log('Current User Data:', this.user);
    });
  }

  ngOnInit(): void {
    this.authService.whoami().subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false),
    });
  }

openSuggestionDialog() {
  const dialogRef = this.dialog.open(SuggestionDialogComponent, {
    width: '500px',
    data: { title: '', description: '' },
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result && this.user) {
      // YOU NEED THIS PART:
      const payload = {
        user_id: this.user.user_id, // Link to the logged-in user
        title: result.title,
        description: result.description
      };
      
      this.http.post('/api/suggestions', payload).subscribe({
        next: () => console.log('Saved to database!'),
        error: (err: any) => console.error('Failed to save', err)
      });
    }
  });
}
  onLogin() {
    this.dialog.open(LoginDialog, {
      width: '400px',
    });
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err) => console.error('Logout failed', err),
    });
  }
}