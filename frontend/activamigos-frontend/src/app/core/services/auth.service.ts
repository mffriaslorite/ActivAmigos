import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { LoginRequest, RegisterRequest, AuthResponse } from '../models/auth.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);

    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/auth/register`,
      userData,
      { withCredentials: true }
    ).pipe(
      tap(response => this.currentUserSubject.next(response.user)),
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
 * Login user
 */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);

    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      map(response => {
        // Establecer el usuario INMEDIATAMENTE en el map
        this.currentUserSubject.next(response.user);
        this.isLoadingSubject.next(false);
        return response;
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.currentUserSubject.next(null)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Check current session
   */
  checkSession(): Observable<{ authenticated: boolean; user?: User }> {
    return this.http.get<{ authenticated: boolean; user?: User }>(
      `${this.API_BASE_URL}/auth/check-session`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.authenticated && response.user) {
          this.currentUserSubject.next(response.user);
        } else {
          this.currentUserSubject.next(null);
        }
      }),
      catchError(error => {
        this.currentUserSubject.next(null);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Get user profile
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(
      `${this.API_BASE_URL}/user/profile`,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Update user profile
   */
  updateProfile(profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(
      `${this.API_BASE_URL}/user/profile`,
      profileData,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Change password
   */
  changePassword(passwordData: { current_password: string; new_password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.API_BASE_URL}/user/change-password`,
      passwordData,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Upload profile image
   */
  uploadProfileImage(imageFile: File): Observable<User> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return this.http.put<User>(
      `${this.API_BASE_URL}/user/profile-image`,
      formData,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Delete user account
   */
  deleteAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_BASE_URL}/user/profile`,
      { withCredentials: true }
    ).pipe(
      tap(() => this.currentUserSubject.next(null)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error del servidor: ${error.status}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  /**
   * ✅ Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  setCurrentUser(user: User | null) {
    this.currentUserSubject.next(user);
  }

}