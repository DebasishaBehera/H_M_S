import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth'; // your backend base URL

  constructor(private http: HttpClient) {}

  login(credentials: any): Observable<any> {
    // Call backend auth API and persist token + role
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        // Persist basic identity info for later (e.g., bookings)
        if (credentials?.email) {
          localStorage.setItem('email', credentials.email);
        }
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
        if (res.role) {
          localStorage.setItem('role', res.role);
        }
      })
    );
  }

  adminLogin(credentials: any): Observable<any> {
    // Separate endpoint for admin login
    return this.http.post<any>(`${this.apiUrl}/admin-login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
        if (res.role) {
          localStorage.setItem('role', res.role);
        }
      })
    );
  }

  signup(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, user).pipe(
      tap(() => {
        if (user?.email) {
          localStorage.setItem('email', user.email);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    return localStorage.getItem('role') === 'ADMIN';
  }

  getUserEmail(): string {
    return localStorage.getItem('email') || '';
  }
}
