import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CategoryDialogComponent } from '../../dialogs/category-dialog/category-dialog';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [
    CommonModule, MatDialogModule, MatSnackBarModule, MatTableModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './manage-categories.html',
  styleUrls: ['./manage-categories.scss']
})
export class ManageCategoriesPage implements OnInit {
  categories: any[] = [];
  displayedColumns = ['id', 'name', 'actions'];
  loading = false; 

  constructor(
    private http: HttpClient, 
    private dialog: MatDialog, 
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; 
    this.http.get<any[]>('/api/categories').subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '350px',
      data: { name: '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.post('/api/categories', { category_name: result }).subscribe({
          next: () => this.load(),
          error: (err) => this.snackBar.open(err.error.error, 'Close')
        });
      }
    });
  }

  openEditDialog(category: any) {
    const dialogRef = this.dialog.open(CategoryDialogComponent, {
      width: '350px',
      data: { id: category.category_id, name: category.category_name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.put(`/api/categories/${category.category_id}`, { category_name: result }).subscribe({
          next: () => this.load(),
          error: (err) => this.snackBar.open(err.error.error, 'Close')
        });
      }
    });
  }

  openDeleteDialog(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: 'Are you sure you want to delete this category? This may affect existing quizzes.' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.delete(`/api/categories/${id}`).subscribe({
          next: () => this.load(),
          error: (err) => this.snackBar.open(err.error.error || 'Category is in use', 'Close')
        });
      }
    });
  }
}