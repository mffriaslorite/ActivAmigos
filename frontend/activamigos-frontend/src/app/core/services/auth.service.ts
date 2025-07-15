import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  bio?: string;
  accessibility_preferences?: AccessibilityPreferences;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  email_verified: boolean;
}

export interface AccessibilityPreferences {
  high_contrast: boolean;
  large_text: boolean;
  screen_reader: boolean;
  keyboard_navigation: boolean;
  reduced_motion: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  accessibility_preferences?: AccessibilityPreferences;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface ApiError {
  error: string;
  details?: string;
  missing_fields?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  // Public observables
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(
    map(user => !!user)
  );

  constructor(private http: HttpClient) {
    this.checkSession();
  }

  /**
   * Get the current user value
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  /**
   * Register a new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/register`,
      userData,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUserSubject.next(response.user);
        this.applyAccessibilityPreferences(response.user.accessibility_preferences);
      }),
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
      `${this.API_BASE_URL}/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUserSubject.next(response.user);
        this.applyAccessibilityPreferences(response.user.accessibility_preferences);
      }),
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<any> {
    this.isLoadingSubject.next(true);
    
    return this.http.post(
      `${this.API_BASE_URL}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.clearAccessibilityPreferences();
      }),
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Get user profile
   */
  getProfile(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(
      `${this.API_BASE_URL}/profile`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUserSubject.next(response.user);
        this.applyAccessibilityPreferences(response.user.accessibility_preferences);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(profileData: Partial<User>): Observable<{ message: string; user: User }> {
    this.isLoadingSubject.next(true);
    
    return this.http.put<{ message: string; user: User }>(
      `${this.API_BASE_URL}/profile`,
      profileData,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUserSubject.next(response.user);
        this.applyAccessibilityPreferences(response.user.accessibility_preferences);
      }),
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Change user password
   */
  changePassword(passwordData: { current_password: string; new_password: string }): Observable<{ message: string }> {
    this.isLoadingSubject.next(true);
    
    return this.http.post<{ message: string }>(
      `${this.API_BASE_URL}/change-password`,
      passwordData,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Check current session
   */
  checkSession(): Observable<{ authenticated: boolean; user?: User }> {
    return this.http.get<{ authenticated: boolean; user?: User }>(
      `${this.API_BASE_URL}/check-session`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.authenticated && response.user) {
          this.currentUserSubject.next(response.user);
          this.applyAccessibilityPreferences(response.user.accessibility_preferences);
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
   * Apply accessibility preferences to the UI
   */
  private applyAccessibilityPreferences(preferences?: AccessibilityPreferences): void {
    if (!preferences) return;

    const body = document.body;
    
    // High contrast mode
    if (preferences.high_contrast) {
      body.classList.add('high-contrast');
    } else {
      body.classList.remove('high-contrast');
    }

    // Large text mode
    if (preferences.large_text) {
      body.classList.add('large-text');
    } else {
      body.classList.remove('large-text');
    }

    // Reduced motion
    if (preferences.reduced_motion) {
      body.classList.add('reduced-motion');
    } else {
      body.classList.remove('reduced-motion');
    }

    // Store preferences in localStorage for persistence
    localStorage.setItem('accessibility_preferences', JSON.stringify(preferences));
  }

  /**
   * Clear accessibility preferences
   */
  private clearAccessibilityPreferences(): void {
    const body = document.body;
    body.classList.remove('high-contrast', 'large-text', 'reduced-motion');
    localStorage.removeItem('accessibility_preferences');
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Server error: ${error.status} ${error.statusText}`;
      }
    }

    console.error('AuthService Error:', error);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Get default accessibility preferences
   */
  getDefaultAccessibilityPreferences(): AccessibilityPreferences {
    return {
      high_contrast: false,
      large_text: false,
      screen_reader: false,
      keyboard_navigation: true,
      reduced_motion: false
    };
  }

  /**
   * Load accessibility preferences from localStorage
   */
  loadStoredAccessibilityPreferences(): AccessibilityPreferences | null {
    const stored = localStorage.getItem('accessibility_preferences');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing stored accessibility preferences:', e);
        localStorage.removeItem('accessibility_preferences');
      }
    }
    return null;
  }
}