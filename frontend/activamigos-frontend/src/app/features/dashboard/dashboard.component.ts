import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Group } from '../../core/models/group.model';
import { Activity } from '../../core/models/activity.model';
import { GroupsService } from '../../core/services/groups.service';
import { ActivitiesService } from '../../core/services/activities.service';
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
  userGroups: Group[] = [];
  upcomingActivities: Activity[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService
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

    this.groupsService.getUserGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => this.userGroups = groups);

    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => this.upcomingActivities = activities);

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

  goToGroups(id: number | null = null) {
    if (id) {
      this.router.navigate(['/groups', id]);
    } else {
      this.router.navigate(['/groups']);
    }
  }

  goToActivities(id: number | null = null) {
    if (id) {
      this.router.navigate(['/activities', id]);
    } else {
      this.router.navigate(['/activities']);
    }
  }

  formatActivityDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityEmoji(title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('deporte') || titleLower.includes('fútbol') || titleLower.includes('correr')) return '⚽';
    if (titleLower.includes('cocina') || titleLower.includes('cocinar') || titleLower.includes('comida')) return '🍳';
    if (titleLower.includes('arte') || titleLower.includes('pintar') || titleLower.includes('dibujo')) return '🎨';
    if (titleLower.includes('música') || titleLower.includes('cantar') || titleLower.includes('baile')) return '🎵';
    if (titleLower.includes('juego') || titleLower.includes('jugar')) return '🎮';
    if (titleLower.includes('lectura') || titleLower.includes('leer') || titleLower.includes('libro')) return '📚';
    if (titleLower.includes('cine') || titleLower.includes('película')) return '🎬';
    if (titleLower.includes('parque') || titleLower.includes('naturaleza') || titleLower.includes('jardín')) return '🌳';
    return '🎯';
  }
}