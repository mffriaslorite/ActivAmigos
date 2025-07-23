import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, take, delay } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      switchMap(user => {
        console.log('AuthGuard - Usuario actual:', user);
        if (user) {
          return of(true);
        } else {
          // Es normal que no haya usuario al navegar, el checkSession lo recupera
          return this.authService.checkSession().pipe(
            map(response => {
              console.log('AuthGuard - Check session response:', response);
              if (response.authenticated && response.user) {
                return true;
              } else {
                this.redirectToLogin(state.url);
                return false;
              }
            }),
            catchError(error => {
              console.log('AuthGuard - Error checking session:', error);
              this.redirectToLogin(state.url);
              return of(false);
            })
          );
        }
      })
    );
  }

  private redirectToLogin(returnUrl: string) {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  }
}