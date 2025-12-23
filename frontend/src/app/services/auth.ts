import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { AppRoute } from '../app.routes';

export interface AuthUser {
  username: string | null;
  roles: number[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/auth';

  // holds currently logged-in user (or null/guest)
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Check current session (who am I)
   */
  whoami(): Observable<AuthUser> {
    return this.http.get<AuthUser>(this.apiUrl).pipe(
      tap(user => {
        // backend returns { username: null, roles: null } for guests
        this.currentUserSubject.next(
          user.username ? user : null
        );
      })
    );
  }

  /**
   * Login with username & password
   */
  login(username: string, password: string): Observable<AuthUser> {
    return this.http.post<AuthUser>(this.apiUrl, { username, password }).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  /**
   * Logout current session
   */
  logout(): Observable<void> {
    return this.http.delete<void>(this.apiUrl).pipe(
      tap(() => this.currentUserSubject.next(null))
    );
  }

  /**
   * Synchronous helpers
   */
  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser?.username;
  }

  hasRole(role: number): boolean {
    return !!this.currentUser?.roles?.includes(role);
  }

  hasAnyRole(roles: number[]): boolean {
    if (!roles || roles.length === 0) return true;
    return roles.some(r => this.currentUser?.roles?.includes(r));
  }

  /**
   * Used by routing/menu visibility
   */
  isRouteAvailable(route: AppRoute): boolean {
    return this.hasAnyRole(route.roles || []);
  }
}
