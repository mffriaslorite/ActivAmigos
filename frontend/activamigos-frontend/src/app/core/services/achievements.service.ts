import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Achievement, GamificationState } from '../models/achivement.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;

  // ✅ 1. Canal de notificaciones (Recuperado para el Punto Rojo)
  private achievementUnlockedSubject = new Subject<Achievement>();
  public achievementUnlocked$ = this.achievementUnlockedSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener TODOS los logros posibles (Catálogo)
   */
  getAllAchievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(
      `${this.API_BASE_URL}/user/achievements/all`,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Obtener mi estado (Puntos, Nivel y Logros desbloqueados)
   */
  getGamificationState(): Observable<GamificationState> {
    return this.http.get<GamificationState>(
      `${this.API_BASE_URL}/user/achievements`,
      { withCredentials: true }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Helper para emitir eventos de notificación manualmente
   */
  notifyUnlock(achievement: Achievement) {
    this.achievementUnlockedSubject.next(achievement);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Achievements Service Error:', error);
    return throwError(() => new Error('Error en el servicio de logros'));
  }
}