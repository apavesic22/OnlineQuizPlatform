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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadUsers();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchText) => {
        this.searchQuery = searchText;
        this.currentPage = 0; // Reset to first page on new search
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
        this.users = res.data; // Assign from 'data' property
        this.totalUsers = res.total; // Update total count for paginator
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  toggleVerification(user: any) {
    const isCurrentlyVerified = user.verified === 1;

    const actionText = isCurrentlyVerified ? 'unverify' : 'verify';
    const buttonColor = isCurrentlyVerified ? 'warn' : 'primary';
    const buttonLabel = isCurrentlyVerified ? 'Unverify' : 'Verify';

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Are you sure you want to ${actionText} ${user.username}?`,
        buttonText: buttonLabel, 
        color: buttonColor, 
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        const newStatus = isCurrentlyVerified ? 0 : 1;
        this.http
          .put(`/api/users/${user.username}`, { verified: newStatus })
          .subscribe({
            next: () => {
              user.verified = newStatus;
              this.snackBar.open(
                `User ${user.username} is now ${
                  newStatus === 1 ? 'verified' : 'unverified'
                }.`,
                'OK',
                { duration: 2000 }
              );
            },
            error: (err) =>
              this.snackBar.open(err.error.error || 'Update failed', 'Close'),
          });
      }
    });
  }
}
