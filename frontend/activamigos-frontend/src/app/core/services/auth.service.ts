import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { LoginRequest, RegisterRequest, AuthResponse, PasswordHint, AnimalListResponse } from '../models/auth.model';

import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_BASE_URL = `${environment.apiUrl}/api`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(map(user => !!user));
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);

    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/auth/register`,
      userData,
      { withCredentials: true }
    ).pipe(
      tap(response => this.currentUserSubject.next(response.user)),
      catchError(this.handleError),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
 * Login user
 */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);

    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      map(response => {
        // Establecer el usuario INMEDIATAMENTE en el map
        this.currentUserSubject.next(response.user);
        this.isLoadingSubject.next(false);
        return response;
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.currentUserSubject.next(null)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Check current session
   */
  checkSession(): Observable<{ authenticated: boolean; user?: User }> {
    return this.http.get<{ authenticated: boolean; user?: User }>(
      `${this.API_BASE_URL}/auth/check-session`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.authenticated && response.user) {
          this.currentUserSubject.next(response.user);
        } else {
          this.currentUserSubject.next(null);
        }
      }),
      catchError(error => {
        this.currentUserSubject.next(null);
        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Get user profile
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(
      `${this.API_BASE_URL}/user/profile`,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Update user profile
   */
  updateProfile(profileData: Partial<User>): Observable<User> {
    return this.http.put<User>(
      `${this.API_BASE_URL}/user/profile`,
      profileData,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Change password
   */
  changePassword(passwordData: { current_password: string; new_password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.API_BASE_URL}/user/change-password`,
      passwordData,
      { withCredentials: true }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Upload profile image
   */
  uploadProfileImage(imageFile: File): Observable<User> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return this.http.put<User>(
      `${this.API_BASE_URL}/user/profile-image`,
      formData,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /** 
   *  ✅ Get profile image URL
   */

  public getProfileImageSrc(): string | null {
    const u = this.currentUserSubject.value;
    if (!u?.profile_image) return null;
    // stream + cache-buster
    return `${this.API_BASE_URL}/user/profile-image/stream?ts=${Date.now()}`;
  }

  /**
   * ✅ Delete profile image
   */
  deleteProfileImage(): Observable<User> {
    return this.http.delete<User>(
      `${this.API_BASE_URL}/user/profile-image`,
      { withCredentials: true }
    ).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Delete user account
   */
  deleteAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.API_BASE_URL}/user/profile`,
      { withCredentials: true }
    ).pipe(
      tap(() => this.currentUserSubject.next(null)),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Handle HTTP errors con mensajes amigables para el usuario
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Algo no ha ido bien, inténtalo de nuevo'; // Mensaje por defecto suave
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      console.error('Error del cliente:', error.error.message);
    } else {
      // Error del backend
      switch (error.status) {
        case 400: // Bad Request
          errorMessage = 'Faltan datos o no son correctos';
          break;
        case 401: // Unauthorized
          errorMessage = 'El nombre o la contraseña no coinciden';
          break;
        case 403: // Forbidden
          errorMessage = 'No tienes permiso para entrar aquí';
          break;
        case 404: // Not Found
          errorMessage = 'No hemos encontrado lo que buscas';
          break;
        case 409: // Conflict
          errorMessage = 'Este nombre de usuario ya está cogido';
          break;
        case 500:
          errorMessage = 'Tenemos un problema técnico, avisa a un monitor';
          break;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  /**
   * ✅ Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.isLoadingSubject.next(isLoading);
  }

  setCurrentUser(user: User | null) {
    this.currentUserSubject.next(user);
  }

  /**
   * ✅ Get password hint for email
   */
  getPasswordHint(email: string): Observable<PasswordHint> {
    return this.http.get<PasswordHint>(
      `${this.API_BASE_URL}/auth/hint`,
      { params: { email } }
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Get available animals list
   */
  getAnimalsList(): Observable<AnimalListResponse> {
    return this.http.get<AnimalListResponse>(
      `${this.API_BASE_URL}/auth/animals`
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Refresh token automatically
   */
  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.user) {
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ Check if user has specific role
   */
  hasRole(role: 'USER' | 'ORGANIZER' | 'SUPERADMIN'): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  /**
   * ✅ Check if user is organizer or admin
   */
  isOrganizerOrAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'ORGANIZER' || user?.role === 'SUPERADMIN';
  }

  /**
   * Verifica si hay una sesión activa en el backend al recargar la página.
   * Llama al endpoint /me que creamos en el backend.
   */
  checkAuthStatus(): Observable<boolean> {
    return this.http.get<User>(`${this.API_BASE_URL}/auth/me`, { withCredentials: true })
      .pipe(
        map(user => {
          // Al actualizar el usuario, isAuthenticated$ se actualiza automáticamente
          this.currentUserSubject.next(user);
          return true;
        }),
        catchError(() => {
          // Si falla, limpiamos el usuario
          this.currentUserSubject.next(null);
          return of(false);
        })
      );
  }

}