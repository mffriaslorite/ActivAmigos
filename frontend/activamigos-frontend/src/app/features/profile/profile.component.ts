import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, BottomNavComponent],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  navigateTo(path: string) {
    if (path === '/settings' || path === '/notifications' || path === '/privacy') {
      alert('Funcionalidad próximamente');
    } else {
      this.router.navigate([path]);
    }
  }

  editProfile() {
    alert('Editar Perfil - Funcionalidad próximamente');
  }

  logout() {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      this.authService.logout()
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.router.navigate(['/auth/login']));
    }
  }
}