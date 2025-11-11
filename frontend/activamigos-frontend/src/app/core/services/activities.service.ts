import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Activity, ActivityCreate, ActivityUpdate, JoinLeaveActivityResponse, ActivityDetails } from '../models/activity.model';
import { AchievementNotificationsSimpleService } from './achievement-notifications-simple.service';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public activities$ = this.activitiesSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private achievementNotifications: AchievementNotificationsSimpleService
  ) {}

  /**
   * Get all activities
   */
  getActivities(): Observable<Activity[]> {
    this.isLoadingSubject.next(true);

    return this.http.get<Activity[]>(
      `${this.API_BASE_URL}/activities`,
      { withCredentials: true }
    ).pipe(
      tap(activities => {
        this.activitiesSubject.next(activities);
        this.isLoadingSubject.next(false);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a specific activity by ID
   */
  getActivity(id: number): Observable<Activity> {
    return this.http.get<Activity>(
      `${this.API_BASE_URL}/activities/${id}`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new activity
   */
  createActivity(activityData: ActivityCreate): Observable<Activity> {
    this.isLoadingSubject.next(true);

    return this.http.post<Activity>(
      `${this.API_BASE_URL}/activities`,
      activityData,
      { withCredentials: true }
    ).pipe(
      tap(async newActivity => {
        // Add the new activity to the current activities list
        const currentActivities = this.activitiesSubject.value;
        this.activitiesSubject.next([newActivity, ...currentActivities]);
        this.isLoadingSubject.next(false);
        
        // Automatically refresh achievements after creating an activity
        try {
          this.achievementNotifications.refreshAchievements();
        } catch (error) {
          console.error('Error refreshing achievements after activity creation:', error);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update an activity
   */
  updateActivity(id: number, activityData: ActivityUpdate): Observable<Activity> {
    return this.http.put<Activity>(
      `${this.API_BASE_URL}/activities/${id}`,
      activityData,
      { withCredentials: true }
    ).pipe(
      tap(updatedActivity => {
        // Update the activity in the current activities list
        const currentActivities = this.activitiesSubject.value;
        const updatedActivities = currentActivities.map(activity =>
          activity.id === id ? updatedActivity : activity
        );
        this.activitiesSubject.next(updatedActivities);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete an activity
   */
  deleteActivity(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_BASE_URL}/activities/${id}`,
      { withCredentials: true }
    ).pipe(
      tap(() => {
        // Remove the activity from the current activities list
        const currentActivities = this.activitiesSubject.value;
        const filteredActivities = currentActivities.filter(activity => activity.id !== id);
        this.activitiesSubject.next(filteredActivities);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Join an activity
   */
  joinActivity(id: number): Observable<JoinLeaveActivityResponse> {
    return this.http.post<JoinLeaveActivityResponse>(
      `${this.API_BASE_URL}/activities/${id}/join`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(async response => {
        // Update the activity's participation status in the current activities list
        this.updateActivityParticipation(id, response.is_participant, response.participant_count);
        
        // Automatically refresh achievements after joining an activity
        if (response.is_participant) {
          try {
            this.achievementNotifications.refreshAchievements();
          } catch (error) {
            console.error('Error refreshing achievements after activity join:', error);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Leave an activity
   */
  leaveActivity(id: number): Observable<JoinLeaveActivityResponse> {
    return this.http.post<JoinLeaveActivityResponse>(
      `${this.API_BASE_URL}/activities/${id}/leave`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => {
        // Update the activity's participation status in the current activities list
        this.updateActivityParticipation(id, response.is_participant, response.participant_count);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update activity participation status in the local state
   */
  private updateActivityParticipation(activityId: number, isParticipant: boolean, participantCount: number): void {
    const currentActivities = this.activitiesSubject.value;
    const updatedActivities = currentActivities.map(activity =>
      activity.id === activityId
        ? { ...activity, is_participant: isParticipant, participant_count: participantCount }
        : activity
    );
    this.activitiesSubject.next(updatedActivities);
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    this.isLoadingSubject.next(false);

    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error('ActivitiesService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  };

  /**
   * Clear activities data (useful for logout)
   */
  clearActivities(): void {
    this.activitiesSubject.next([]);
  }

  /**
   * Get activity details with participants
   */
  getActivityDetails(id: number): Observable<ActivityDetails> {
    return this.http.get<ActivityDetails>(
      `${this.API_BASE_URL}/activities/${id}/details`,
      { withCredentials: true }
    ).pipe(
      catchError((error) => {
        console.warn('Activity details endpoint not available, falling back to basic activity data', error);
        // Fallback to basic activity data with mock participants
        return this.getActivity(id).pipe(
          map(activity => this.createMockActivityDetails(activity))
        );
      })
    );
  }

  /**
   * Create mock activity details for development
   */
  private createMockActivityDetails(activity: Activity): ActivityDetails {
    const mockParticipants = [
      {
        id: 1,
        username: 'sofia',
        first_name: 'Sofia',
        last_name: '',
        profile_image: '',
        is_organizer: true,
        joined_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        attendance_status: 'confirmed' as const,
        warning_count: 1,
        semaphore_color: 'yellow' as const
      },
      {
        id: 2,
        username: 'carlos',
        first_name: 'Carlos',
        last_name: '',
        profile_image: '',
        is_organizer: false,
        joined_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        attendance_status: 'pending' as const,
        warning_count: 0,
        semaphore_color: 'light_green' as const
      },
      {
        id: 3,
        username: 'ana',
        first_name: 'Ana',
        last_name: '',
        profile_image: '',
        is_organizer: false,
        joined_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        attendance_status: 'pending' as const,
        warning_count: 2,
        semaphore_color: 'red' as const
      },
      {
        id: 4,
        username: 'javier',
        first_name: 'Javier',
        last_name: '',
        profile_image: '',
        is_organizer: false,
        joined_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        attendance_status: 'pending' as const,
        warning_count: 2,
        semaphore_color: 'red' as const
      },
      {
        id: 5,
        username: 'elena',
        first_name: 'Elena',
        last_name: '',
        profile_image: '',
        is_organizer: false,
        joined_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        attendance_status: 'pending' as const,
        warning_count: 0,
        semaphore_color: 'light_green' as const
      }
    ];

    return {
      ...activity,
      participants: mockParticipants.slice(0, Math.min(activity.participant_count, mockParticipants.length))
    };
  }

  /**
   * Get user activities
   */
  getUserActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.API_BASE_URL}/activities`, { withCredentials: true });
  }

  /**
   * Get upcoming activities for dashboard
   */
  getUpcomingActivities(): Observable<Activity[]> {
    return this.getActivities().pipe(
      map(activities => {
        const now = new Date();
        return activities
          .filter(activity => new Date(activity.date) > now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3); // Get next 3 upcoming activities
      })
    );
  }

  /**
   * Get activities by date
   */
  getActivitiesByDate(date: Date): Observable<Activity[]> {
    return this.getActivities().pipe(
      map(activities => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        return activities.filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= targetDate && activityDate < nextDay;
        });
      })
    );
  }

  /**
   * Get user's role in a specific activity
   */
  getUserRoleInActivity(activityId: number): Observable<{ role: string | null }> {
    return this.http.get<{ role: string | null }>(
      `${this.API_BASE_URL}/activities/${activityId}/user-role`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

}
