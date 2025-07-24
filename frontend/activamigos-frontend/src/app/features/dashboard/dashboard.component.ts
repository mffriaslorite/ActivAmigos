import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { DesktopLayoutComponent } from '../../shared/components/desktop-layout/desktop-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, DesktopLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
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

    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  showCreateOptions() {
    // For now, show a simple alert with options
    // In future sprints, this could open a modal or action sheet
    const action = confirm('¿Qué te gustaría crear?\n\nOK = Nuevo Grupo\nCancelar = Nueva Actividad');
    if (action) {
      alert('Crear Nuevo Grupo - Funcionalidad próximamente');
    } else {
      alert('Crear Nueva Actividad - Funcionalidad próximamente');
    }
  }

  logout() {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.router.navigate(['/auth/login']));
  }
}
