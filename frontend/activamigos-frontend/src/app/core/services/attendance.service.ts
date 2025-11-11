import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AttendanceRecord {
  id: number;
  activity_id: number;
  user_id: number;
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image?: string;
  };
  confirmed_at?: string;
  present?: boolean;
  marked_by?: number;
  marker?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  created_at: string;
  updated_at?: string;
}

export interface ActivityAttendance {
  activity_id: number;
  attendance: AttendanceRecord[];
}

export interface PendingActivity {
  activity: {
    id: number;
    title: string;
    description?: string;
    date: string;
    location?: string;
  };
  needs_confirmation: boolean;
  attendance_status?: AttendanceRecord;
}

export interface AttendanceMarkingData {
  user_id: number;
  present: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  
  private pendingActivitiesSubject = new BehaviorSubject<PendingActivity[]>([]);
  public pendingActivities$ = this.pendingActivitiesSubject.asObservable();
  
  // Cooldown management
  private readonly COOLDOWN_KEY = 'attendance_modal_cooldowns';
  private readonly DEFAULT_COOLDOWN_HOURS = 1;
  private readonly URGENT_THRESHOLD_MINUTES = 30;

  constructor(private http: HttpClient) {}

  /**
   * Check if we should show the attendance modal for an activity
   */
  shouldShowAttendanceModal(activityId: number, activityDate: string): boolean {
    const cooldowns = this.getCooldowns();
    const now = new Date().getTime();
    const activityTime = new Date(activityDate).getTime();
    
    // Check if there's an active cooldown
    if (cooldowns[activityId] && cooldowns[activityId] > now) {
      // If activity is starting in less than 30 minutes, override cooldown
      const minutesUntilActivity = (activityTime - now) / (1000 * 60);
      return minutesUntilActivity <= this.URGENT_THRESHOLD_MINUTES;
    }
    
    return true;
  }

  /**
   * Set cooldown for an activity modal
   */
  setCooldown(activityId: number, activityDate: string): void {
    const cooldowns = this.getCooldowns();
    const now = new Date().getTime();
    const activityTime = new Date(activityDate).getTime();
    const minutesUntilActivity = (activityTime - now) / (1000 * 60);
    
    // Shorter cooldown as activity approaches
    let cooldownHours = this.DEFAULT_COOLDOWN_HOURS;
    if (minutesUntilActivity <= 120) { // 2 hours or less
      cooldownHours = 0.5; // 30 minutes
    } else if (minutesUntilActivity <= 360) { // 6 hours or less
      cooldownHours = 1; // 1 hour
    }
    
    cooldowns[activityId] = now + (cooldownHours * 60 * 60 * 1000);
    localStorage.setItem(this.COOLDOWN_KEY, JSON.stringify(cooldowns));
  }

  /**
   * Clear cooldown for an activity (when confirmed)
   */
  clearCooldown(activityId: number): void {
    const cooldowns = this.getCooldowns();
    delete cooldowns[activityId];
    localStorage.setItem(this.COOLDOWN_KEY, JSON.stringify(cooldowns));
  }

  private getCooldowns(): { [activityId: number]: number } {
    try {
      const stored = localStorage.getItem(this.COOLDOWN_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  confirmAttendance(activityId: number, willAttend: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.API_BASE_URL}/attendance/confirm`, { 
      activity_id: activityId,
      will_attend: willAttend
    })
      .pipe(
        tap(() => {
          // Clear cooldown when attendance is confirmed (regardless of yes/no)
          this.clearCooldown(activityId);
          // Refresh pending activities
          this.refreshPendingActivities();
        })
      );
  }

  /**
   * Mark attendance for activity participants (organizer/admin only)
   */
  markAttendance(activityId: number, attendees: AttendanceMarkingData[]): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/attendance/activities/${activityId}/mark`, {
      attendees: attendees
    }, { withCredentials: true }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get attendance records for an activity
   */
  getActivityAttendance(activityId: number): Observable<ActivityAttendance> {
    return this.http.get<ActivityAttendance>(
      `${this.API_BASE_URL}/attendance/activities/${activityId}`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get activities that need confirmation from current user
   */
  getPendingConfirmations(): Observable<{ activities: PendingActivity[] }> {
    return this.http.get<{ activities: PendingActivity[] }>(
      `${this.API_BASE_URL}/attendance/user/pending`,
      { withCredentials: true }
    ).pipe(
      tap(response => this.pendingActivitiesSubject.next(response.activities)),
      catchError(this.handleError)
    );
  }

  /**
   * Get current user's attendance history
   */
  getUserAttendanceHistory(limit?: number): Observable<{ attendance_history: AttendanceRecord[] }> {
    const params: any = {};
    if (limit) params.limit = limit.toString();

    return this.http.get<{ attendance_history: AttendanceRecord[] }>(
      `${this.API_BASE_URL}/attendance/user/history`,
      { params, withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Load pending activities (called internally)
   */
  private loadPendingActivities(): void {
    this.getPendingConfirmations().subscribe({
      next: () => {}, // Data is already set in tap operator
      error: (error) => {
        console.error('Error loading pending activities:', error);
        this.pendingActivitiesSubject.next([]);
      }
    });
  }

  /**
   * Get current pending activities count
   */
  getPendingCount(): number {
    return this.pendingActivitiesSubject.value.length;
  }

  /**
   * Check if there are activities needing confirmation
   */
  hasPendingActivities(): boolean {
    return this.getPendingCount() > 0;
  }

  /**
   * Refresh pending activities
   */
  refreshPendingActivities(): void {
    this.loadPendingActivities();
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Attendance service error:', error);
    throw error;
  }
}