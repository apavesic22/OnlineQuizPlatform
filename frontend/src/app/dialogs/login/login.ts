import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RegisterDialog } from '../register/register';
import { AuthService } from '../../services/authService';

@Component({
  selector: 'login-dialog',
  standalone: true,
  styleUrls: ["./login.scss"],
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Login</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" />
        </mat-form-field>
      </mat-dialog-content>

      <div style="margin-top: 15px; text-align: center;">
        Not registered?
        <a
          (click)="onRegister()"
          style="color: blue; cursor: pointer; text-decoration: underline;"
          >Register now</a
        >
      </div>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          type="submit"
          [disabled]="form.invalid"
        >
          Login
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .full {
        width: 100%;
      }
    `,
  ],
})
export class LoginDialog {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<LoginDialog>,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onRegister() {
    this.dialogRef.close();
    this.dialog.open(RegisterDialog, { width: '400px' });
  }

  onSubmit() {
    const { username, password } = this.form.value;

    this.auth.login(username, password).subscribe({
      next: (user) => {
        this.snack.open(`Welcome back, ${user.username}!`, 'Close', {
          duration: 3000,
        });
        this.dialogRef.close();
      },
      error: (err) => {
        this.snack.open('Invalid username or password', 'Close', {
          duration: 3000,
        });
        console.error('Login failed', err);
      },
    });
  }
}
