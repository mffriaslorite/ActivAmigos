import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface PointsEntry {
  id: number;
  points: number;
  reason: string;
  context_type?: string;
  context_id?: number;
  created_at: string;
}

export interface PointsBalance {
  points: number;
}

export interface PointsHistory {
  history: PointsEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;
  private currentPointsSubject = new BehaviorSubject<number>(0);

  public currentPoints$ = this.currentPointsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentPoints();
  }

  /**
   * Get current user's points balance
   */
  getBalance(): Observable<PointsBalance> {
    return this.http.get<PointsBalance>(
      `${this.API_BASE_URL}/points/balance`,
      { withCredentials: true }
    ).pipe(
      tap(response => this.currentPointsSubject.next(response.points)),
      catchError(this.handleError)
    );
  }

  /**
   * Get current user's points history
   */
  getHistory(): Observable<PointsHistory> {
    return this.http.get<PointsHistory>(
      `${this.API_BASE_URL}/points/history`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Load current points (called on service initialization)
   */
  private loadCurrentPoints(): void {
    this.getBalance().subscribe({
      next: () => {}, // Points already updated in tap operator
      error: () => this.currentPointsSubject.next(0)
    });
  }

  /**
   * Get current points value
   */
  getCurrentPoints(): number {
    return this.currentPointsSubject.value;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('Points service error:', error);
    throw error;
  }
}