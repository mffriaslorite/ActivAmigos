import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface WarningRequest {
  target_user_id: number;
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
  reason: string;
}

export interface WarningResponse {
  message: string;
  // Estos datos ahora vendrán calculados desde el backend
  warning_count: number;
  new_semaphore_color: string;
  was_banned: boolean;
}

export interface ModerationStatus {
  warning_count: number;
  status: 'ACTIVE' | 'BANNED' | 'LEFT';
  semaphore_color: string; // 'green', 'yellow', 'red'
}

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  issueWarning(data: WarningRequest): Observable<WarningResponse> {
    return this.http.post<WarningResponse>(
      `${this.API_BASE_URL}/moderation/warnings`, 
      data,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getUserWarnings(userId: number): Observable<any> {
    // Este endpoint lo crearemos ahora en el backend
    return this.http.get(
      `${this.API_BASE_URL}/moderation/users/${userId}/warnings`,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getMyStatus(contextType: 'GROUP' | 'ACTIVITY', contextId: number, userId: number): Observable<ModerationStatus> {
    const params = new HttpParams()
      .set('context_type', contextType)
      .set('context_id', contextId.toString())
      .set('user_id', userId.toString());

    return this.http.get<ModerationStatus>(
      `${this.API_BASE_URL}/moderation/status`,
      { params, withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Moderation Service Error:', error);
    return throwError(() => new Error(error.error?.message || 'Error desconocido'));
  }
}