import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/authService';

@Component({
  selector: 'register-dialog',
  standalone: true,
  styleUrls: ["./register.scss"],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>Register</h2>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Confirm Password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" />
          @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
            <mat-error>Passwords do not match</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
          Register
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`.full { width: 100%; }`]
})
export class RegisterDialog {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<RegisterDialog>
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.form.invalid) return;

    const { username, email, password } = this.form.value;
    
    this.auth.register({ username, email, password }).subscribe({
      next: () => {
        this.snack.open('Registration successful! Please login.', 'Close', { duration: 3000 });
        this.dialogRef.close();
      },
      error: (err: any) => {
        this.snack.open(err.error?.error || 'Registration failed', 'Close', { duration: 3000 });
      }
    });
  }
}