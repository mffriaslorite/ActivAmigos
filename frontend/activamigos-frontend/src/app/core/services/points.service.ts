import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PointsEntry {
  id: number;
  user_id: number;
  points: number;
  reason: string;
  context_type?: string;
  context_id?: number;
  created_at: string;
  created_by?: number;
  user?: any;
  creator?: any;
}

export interface UserPointsTotal {
  user_id: number;
  total_points: number;
}

export interface UserPointsHistory {
  user_id: number;
  history: PointsEntry[];
}

export interface AwardPointsRequest {
  user_id: number;
  points: number;
  reason: string;
  context_type?: string;
  context_id?: number;
}

export interface PointsResponse {
  message: string;
  entry: PointsEntry;
}

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private readonly API_BASE_URL = 'http://localhost:5000/api/points';

  constructor(private http: HttpClient) {}

  /**
   * Get total points for a user
   */
  getUserTotalPoints(userId: number): Observable<UserPointsTotal> {
    return this.http.get<UserPointsTotal>(
      `${this.API_BASE_URL}/user/${userId}/total`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get points history for a user
   */
  getUserPointsHistory(userId: number, limit: number = 50): Observable<UserPointsHistory> {
    return this.http.get<UserPointsHistory>(
      `${this.API_BASE_URL}/user/${userId}/history`,
      { 
        params: { limit: limit.toString() },
        withCredentials: true 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Award points to a user (organizer/admin only)
   */
  awardPoints(request: AwardPointsRequest): Observable<PointsResponse> {
    return this.http.post<PointsResponse>(
      `${this.API_BASE_URL}/award`,
      request,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Deduct points from a user (organizer/admin only)
   */
  deductPoints(request: AwardPointsRequest): Observable<PointsResponse> {
    return this.http.post<PointsResponse>(
      `${this.API_BASE_URL}/deduct`,
      request,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
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