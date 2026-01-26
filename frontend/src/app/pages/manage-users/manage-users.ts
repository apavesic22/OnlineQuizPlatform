import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { MatFormField, MatLabel, MatInputModule } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { AuthService } from '../../services/authService';
import { UserFormDialogComponent } from '../../dialogs/user-form-dialog/user-form-dialog';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormField,
    MatLabel,
    MatPaginator,
    MatInputModule
  ],
  templateUrl: './manage-users.html',
  styleUrls: ['./manage-users.scss'],
})
export class ManageUsersPage implements OnInit {
  users: any[] = [];
  searchQuery: string = '';
  totalUsers = 0;
  currentPage = 0;
  pageSize = 10;
  loading = false;
  isAdmin = false;
  isManager = false;
  private searchSubject = new Subject<string>();

  displayedColumns: string[] = [
    'username',
    'email',
    'role',
    'status',
    'actions',
  ];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isAdmin = user?.role_id === 1;
      this.isManager = user?.role_id === 2;
    });

    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchText) => {
        this.searchQuery = searchText;
        this.currentPage = 0;
        this.loadUsers();
      });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  loadUsers() {
    this.loading = true;
    const pageForApi = this.currentPage + 1;
    const url = `/api/users?page=${pageForApi}&limit=${this.pageSize}&search=${this.searchQuery}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.users = res.data; 
        this.totalUsers = res.total; 
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(UserFormDialogComponent, { width: '450px', data: {} });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.post('/api/users', result).subscribe({
          next: () => {
            this.snackBar.open('User created successfully', 'OK', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => this.snackBar.open(err.error?.error || 'Create failed', 'Close')
        });
      }
    });
  }

  openEditDialog(user: any) {
    const dialogRef = this.dialog.open(UserFormDialogComponent, { width: '450px', data: { user } });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.http.put(`/api/users/${user.username}`, result).subscribe({
          next: () => {
            this.snackBar.open('User updated', 'OK', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => this.snackBar.open(err.error?.error || 'Update failed', 'Close')
        });
      }
    });
  }

  deleteUser(user: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to permanently delete user ${user.username}?`,
        buttonText: 'Delete User',
        color: 'warn'
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.http.delete(`/api/users/${user.username}`).subscribe({
          next: () => {
            this.snackBar.open('User deleted', 'OK', { duration: 3000 });
            this.loadUsers();
          },
          error: (err) => this.snackBar.open(err.error?.error || 'Delete failed', 'Close')
        });
      }
    });
  }

toggleVerification(user: any) {
    const isCurrentlyVerified = user.verified === 1;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to ${isCurrentlyVerified ? 'unverify' : 'verify'} ${user.username}?`,
        buttonText: isCurrentlyVerified ? 'Unverify' : 'Verify',
        color: isCurrentlyVerified ? 'warn' : 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const newStatus = isCurrentlyVerified ? 0 : 1;
        const newRoleId = isCurrentlyVerified ? 4 : 3;
        this.http.put(`/api/users/${user.username}`, { verified: newStatus, role_id: newRoleId }).subscribe({
          next: (res: any) => {
            user.verified = res.verified !== undefined ? res.verified : newStatus;
            user.role_id = newRoleId;
            user.role_name = newRoleId === 3 ? 'Verified User' : 'Standard User';
            this.snackBar.open(`User is now ${user.verified === 1 ? 'verified' : 'unverified'}.`, 'OK', { duration: 2000 });
          }
        });
      }
    });
  }

  
}
