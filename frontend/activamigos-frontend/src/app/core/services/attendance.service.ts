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

  constructor(private http: HttpClient) {
    this.loadPendingActivities();
  }

  /**
   * Confirm attendance for an activity
   */
  confirmAttendance(activityId: number): Observable<any> {
    return this.http.post(`${this.API_BASE_URL}/attendance/confirm`, {
      activity_id: activityId
    }, { withCredentials: true }).pipe(
      tap(() => this.loadPendingActivities()), // Refresh pending activities
      catchError(this.handleError)
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