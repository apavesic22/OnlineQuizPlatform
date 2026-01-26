import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, catchError, of } from 'rxjs';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = '/api/auth';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  isLoggedIn(): boolean {
    const user = this.currentUserSubject.value;
    return !!(user && user.username);
  }

  whoami(): Observable<User> {
    return this.http.get<User>(this.apiUrl).pipe(
      map((user) => {
        if (user && user.roles && user.roles.length > 0) {
          user.role_id = user.roles[0];
        }
        return user;
      }),
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<User>(this.apiUrl, { username, password }).pipe(
      map((user) => {
        if (user && user.roles && user.roles.length > 0) {
          user.role_id = user.roles[0];
        }
        return user;
      }),
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  logout(): Observable<void> {
    return this.http
      .delete<void>(this.apiUrl)
      .pipe(tap(() => this.currentUserSubject.next(null)));
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }
}
