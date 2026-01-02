import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './services/auth';
import { User } from './models/user';
import { LoginDialog } from './dialogs/login/login';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule
],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  title = 'Quizify';
  user: User | null = null;
  loading = true;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  ngOnInit(): void {
    this.authService.whoami().subscribe({
      next: () => this.loading = false,
      error: () => this.loading = false
    });
  }

  onLogin() {
    this.dialog.open(LoginDialog, {
      width: '400px'
    });
  }

  onLogout() {
    this.authService.logout().subscribe();
  }

  get isLoggedIn(): boolean {
    return !!this.user?.username;
  }
}
