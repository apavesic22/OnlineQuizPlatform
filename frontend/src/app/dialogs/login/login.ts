import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'login',
  standalone: true,
  imports: [MatDialogModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginDialog {
  form: FormGroup;

  constructor(
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<LoginDialog>,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onLogin(): void {
    if (!this.form.valid) {
      return;
    }

    const username = this.form.get('username')!.value;
    const password = this.form.get('password')!.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.snackBar.open('Login successful', 'Close', {
          duration: 5000,
          panelClass: ['snackbar-success']
        });
        this.dialogRef.close(true);
      },
      error: () => {
        this.snackBar.open('Invalid username or password', 'Close', {
          duration: 5000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}
