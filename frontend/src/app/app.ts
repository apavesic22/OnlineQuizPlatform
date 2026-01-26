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
import { AuthService } from './services/authService';
import { LoginDialog } from './dialogs/login/login';
import { SuggestionDialogComponent } from './dialogs/suggestions/suggestions';
import { User } from './models/user';

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
  user: User | null = null;
  loading = true;
  isLoggedIn = false;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient
  ) {
    this.authService.currentUser$.subscribe((userData) => {
      this.user = userData;
      this.isLoggedIn = !!userData;
      this.router.events.subscribe(event => {
    console.log('Navigation Event:', event);
  });
      console.log('User Data Sync:', this.user);
    });
  }

  ngOnInit(): void {
    this.authService.whoami().subscribe({
      next: () => (this.loading = false),
      error: () => {
        this.loading = false;
        this.isLoggedIn = false;
      }
    });
  }

openSuggestionDialog() {
  const dialogRef = this.dialog.open(SuggestionDialogComponent, {
    width: '500px',
    data: { title: '', description: '' },
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result && this.user) {
      const payload = {
        user_id: this.user.user_id,
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
        this.isLoggedIn = false;
        this.user = null;
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        this.isLoggedIn = false;
        this.user = null;
        this.router.navigate(['/home']);
      }
    });
  }
}