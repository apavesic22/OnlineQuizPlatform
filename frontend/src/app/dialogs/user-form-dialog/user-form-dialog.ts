import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.user ? 'Edit User' : 'Create User' }}</h2>
    <form [formGroup]="userForm" (ngSubmit)="onSave()">
      <mat-dialog-content class="dialog-content">
        
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
        </mat-form-field>

        @if (!data.user) {
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password">
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role_id">
            <mat-option [value]="1">Administrator</mat-option>
            <mat-option [value]="2">Manager</mat-option>
            <mat-option [value]="3">Verified User</mat-option>
            <mat-option [value]="4">Standard User</mat-option>
          </mat-select>
        </mat-form-field>

      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="userForm.invalid">Save</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      background: rgba(15, 23, 42, 0.98) !important;
      backdrop-filter: blur(25px);
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 24px !important;
      padding: 10px !important;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5) !important;
    }

    .mat-mdc-dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.6rem !important;
      font-weight: 800 !important;
      background: linear-gradient(45deg, #06b6d4, #8b5cf6);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      padding-bottom: 5px !important;

      mat-icon { 
        color: #06b6d4 !important; 
        -webkit-text-fill-color: #06b6d4; 
        font-size: 28px; width: 28px; height: 28px;
      }
    }

    .subtitle {
      color: #94a3b8;
      margin-top: -10px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 20px 0 !important;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: rgba(255, 255, 255, 0.05) !important;
      border-radius: 12px !important;
      transition: all 0.3s ease;
    }

    ::ng-deep .mat-mdc-form-field-focus-overlay { background: transparent; }
    
    ::ng-deep .mat-mdc-input-element { color: #fff !important; }
    ::ng-deep .mdc-floating-label { color: rgba(255, 255, 255, 0.6) !important; }
    ::ng-deep .mat-mdc-form-field-icon-prefix { color: #06b6d4 !important; margin-right: 8px; }

    ::ng-deep .mat-mdc-select-value { color: #fff !important; }
    ::ng-deep .mat-mdc-select-arrow { color: #06b6d4 !important; }

    .custom-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 10px 15px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 10px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .mat-mdc-dialog-actions {
      padding: 20px 0 10px 0 !important;
      gap: 12px;
    }

    .cancel-btn {
      color: #94a3b8 !important;
      font-weight: 700 !important;
      &:hover { background: rgba(255, 255, 255, 0.05) !important; }
    }

    .save-btn {
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%) !important;
      color: white !important;
      border-radius: 12px !important;
      font-weight: 800 !important;
      padding: 0 25px !important;
      height: 45px !important;
      box-shadow: 0 10px 20px rgba(6, 182, 212, 0.3) !important;

      &:disabled {
        background: rgba(255, 255, 255, 0.1) !important;
        color: rgba(255, 255, 255, 0.3) !important;
      }
    }
  `]
})
export class UserFormDialogComponent  {
  userForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: any }
  ) {
    this.userForm = this.fb.group({
      username: [data.user?.username || '', Validators.required],
      email: [data.user?.email || '', [Validators.required, Validators.email]],
      password: ['', data.user ? [] : [Validators.required]],
      role_id: [data.user?.role_id || 4, Validators.required],
      verified: [data.user?.verified === 1 || false]
    }, { validators: this.verifyRoleConstraint });
  }

  verifyRoleConstraint(group: FormGroup) {
    const role = group.get('role_id')?.value;
    const verified = group.get('verified')?.value;
    return (role === 4 && verified) ? { invalidStandardUser: true } : null;
  }

  onSave() { if (this.userForm.valid) this.dialogRef.close(this.userForm.value); }
  onCancel() { this.dialogRef.close(); }
}