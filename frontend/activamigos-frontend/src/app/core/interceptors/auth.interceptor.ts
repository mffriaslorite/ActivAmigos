import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Agregar withCredentials por defecto
    const clonedRequest = req.clone({
      withCredentials: true
    });

    // Activamos loading
    this.authService.setLoading(true);

    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 403) {
          console.warn('Sesión expirada o no autorizada');
          this.authService.logout().subscribe(() => {
            this.router.navigate(['/auth/login'], {
              queryParams: { sessionExpired: true }
            });
          });
        }
        return throwError(() => error);
      }),
      finalize(() => {
        // Desactivamos loading
        this.authService.setLoading(false);
      })
    );
  }
}
