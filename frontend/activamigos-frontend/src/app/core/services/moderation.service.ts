import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  IssueWarningRequest, 
  IssueWarningResponse, 
  ModerationStatus, 
  Warning,
  Membership
} from '../models/moderation.model';

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private readonly API_BASE_URL = 'http://localhost:5000/api/moderation';

  constructor(private http: HttpClient) {}

  /**
   * Issue a warning to a user (organizer/admin only)
   */
  issueWarning(request: IssueWarningRequest): Observable<IssueWarningResponse> {
    return this.http.post<IssueWarningResponse>(
      `${this.API_BASE_URL}/warnings`,
      request,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get moderation status for a user in a specific context
   */
  getModerationStatus(
    contextType: 'GROUP' | 'ACTIVITY',
    contextId: number,
    userId?: number
  ): Observable<ModerationStatus> {
    let params = new HttpParams()
      .set('context_type', contextType)
      .set('context_id', contextId.toString());
    
    if (userId) {
      params = params.set('user_id', userId.toString());
    }

    return this.http.get<ModerationStatus>(
      `${this.API_BASE_URL}/status`,
      { 
        params, 
        withCredentials: true 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Unban a user (superadmin only)
   */
  unbanUser(membershipId: number): Observable<{ message: string; membership: Membership }> {
    return this.http.patch<{ message: string; membership: Membership }>(
      `${this.API_BASE_URL}/memberships/${membershipId}/unban`,
      {},
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get warnings for a context (organizer/admin only)
   */
  getWarnings(
    contextType: 'GROUP' | 'ACTIVITY',
    contextId: number
  ): Observable<{ warnings: Warning[] }> {
    const params = new HttpParams()
      .set('context_type', contextType)
      .set('context_id', contextId.toString());

    return this.http.get<{ warnings: Warning[] }>(
      `${this.API_BASE_URL}/warnings`,
      { 
        params, 
        withCredentials: true 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get semaphore color class for UI
   */
  getSemaphoreColorClass(color: string): string {
    switch (color) {
      case 'grey': return 'bg-gray-400';
      case 'light_green': return 'bg-green-300';
      case 'dark_green': return 'bg-green-600';
      case 'yellow': return 'bg-yellow-400';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  }

  /**
   * Get semaphore color description for accessibility
   */
  getSemaphoreDescription(color: string): string {
    switch (color) {
      case 'grey': return 'No participa';
      case 'light_green': return 'Unido pero nunca ha chateado';
      case 'dark_green': return 'Activo en el chat';
      case 'yellow': return 'Tiene advertencias';
      case 'red': return 'Baneado del chat';
      default: return 'Estado desconocido';
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
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