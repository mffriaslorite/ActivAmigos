import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  Achievement, 
  GamificationState, 
  UpdateGamificationRequest 
} from '../models/achievement.model';

@Injectable({
  providedIn: 'root'
})
export class AchievementsService {
  private readonly API_BASE_URL = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  /**
   * Get user's complete gamification state
   */
  getGamificationState(): Observable<GamificationState> {
    return this.http.get<GamificationState>(
      `${this.API_BASE_URL}/user/achievements`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update user's gamification state by adding points and/or achievements
   */
  updateGamificationState(data: UpdateGamificationRequest): Observable<GamificationState> {
    return this.http.post<GamificationState>(
      `${this.API_BASE_URL}/user/achievements`,
      data,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Add points to user's account
   */
  addPoints(points: number): Observable<GamificationState> {
    return this.updateGamificationState({ points });
  }

  /**
   * Award achievement to user
   */
  awardAchievement(achievementId: number): Observable<GamificationState> {
    return this.updateGamificationState({ achievement_id: achievementId });
  }

  /**
   * Get all available achievements
   */
  getAllAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(
      `${this.API_BASE_URL}/user/achievements/all`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get achievement icon URL with cache busting
   */
  getAchievementIconUrl(achievementId: number): string {
    return `${this.API_BASE_URL}/user/achievements/icons/${achievementId}?ts=${Date.now()}`;
  }

  /**
   * Handle HTTP errors
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
}