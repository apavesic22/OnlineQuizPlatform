import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-category-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.id ? 'Rename' : 'Add' }} Category</h2>
    <mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%; margin-top: 10px;">
        <mat-label>Category Name</mat-label>
        <input matInput [(ngModel)]="data.name" placeholder="Ex. Science" required>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">Cancel</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="data.name" [disabled]="!data.name">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./category-dialog.scss'],
})
export class CategoryDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id?: number; name: string }
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}