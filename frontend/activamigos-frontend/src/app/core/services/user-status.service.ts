import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface UserOverallStatus {
  overall_semaphore_color: 'grey' | 'light_green' | 'dark_green' | 'yellow' | 'red';
  total_warnings: number;
  active_groups: number;
  active_activities: number;
  banned_contexts: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserStatusService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  
  private userStatusSubject = new BehaviorSubject<UserOverallStatus>({
    overall_semaphore_color: 'grey',
    total_warnings: 0,
    active_groups: 0,
    active_activities: 0,
    banned_contexts: 0
  });

  public userStatus$ = this.userStatusSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Update status when user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserStatus();
      } else {
        this.resetUserStatus();
      }
    });
  }

  /**
   * Load user's overall status
   */
  loadUserStatus(): void {
    this.getUserOverallStatus().subscribe({
      next: (status) => {
        this.userStatusSubject.next(status);
      },
      error: (error) => {
        console.error('Error loading user status:', error);
        this.resetUserStatus();
      }
    });
  }

  /**
   * Get user's overall moderation status
   */
  getUserOverallStatus(): Observable<UserOverallStatus> {
    return this.http.get<UserOverallStatus>(
      `${this.API_BASE_URL}/user/status/overall`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get current user status
   */
  getCurrentStatus(): UserOverallStatus {
    return this.userStatusSubject.value;
  }

  /**
   * Check if user has any warnings
   */
  hasWarnings(): boolean {
    return this.userStatusSubject.value.total_warnings > 0;
  }

  /**
   * Check if user is banned from any context
   */
  hasBans(): boolean {
    return this.userStatusSubject.value.banned_contexts > 0;
  }

  /**
   * Get semaphore color for display
   */
  getSemaphoreColor(): string {
    return this.userStatusSubject.value.overall_semaphore_color;
  }

  /**
   * Get warning count for display
   */
  getWarningCount(): number {
    return this.userStatusSubject.value.total_warnings;
  }

  /**
   * Reset user status
   */
  private resetUserStatus(): void {
    this.userStatusSubject.next({
      overall_semaphore_color: 'grey',
      total_warnings: 0,
      active_groups: 0,
      active_activities: 0,
      banned_contexts: 0
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<UserOverallStatus> {
    console.error('User status service error:', error);
    // Return default status on error
    return new Observable<UserOverallStatus>(observer => {
      observer.next({
        overall_semaphore_color: 'grey',
        total_warnings: 0,
        active_groups: 0,
        active_activities: 0,
        banned_contexts: 0
      });
      observer.complete();
    });
  }
}