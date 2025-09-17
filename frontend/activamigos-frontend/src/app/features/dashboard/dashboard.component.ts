import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PointsService } from '../../core/services/points.service';
import { User } from '../../core/models/user.model';
import { Group } from '../../core/models/group.model';
import { Activity } from '../../core/models/activity.model';
import { GroupsService } from '../../core/services/groups.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BottomNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
  totalPoints = 0;
  private destroy$ = new Subject<void>();
  userGroups: Group[] = [];
  upcomingActivities: Activity[] = [];
  todayActivities: Activity[] = [];
  availableActivities: Activity[] = [];

  // Calendar view properties
  weekDays: { date: Date; dayName: string; dayNumber: number; isToday: boolean; activities: Activity[] }[] = [];
  showCalendarView = true;

  constructor(
    private authService: AuthService,
    private pointsService: PointsService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserPoints(user.id);
        }
      });

    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    this.loadDashboardData();
    this.generateWeekCalendar();
  }

  private loadUserPoints(userId: number) {
    this.pointsService.getUserTotalPoints(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.totalPoints = response.total_points,
        error: (error) => console.error('Error loading points:', error)
      });
  }

  private loadDashboardData() {
    // Load user groups
    this.groupsService.getUserGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => this.userGroups = groups,
        error: (error) => console.error('Error loading groups:', error)
      });

    // Load today's activities
    this.loadTodayActivities();

    // Load upcoming activities
    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.upcomingActivities = activities;
          this.generateWeekCalendar();
        },
        error: (error) => console.error('Error loading activities:', error)
      });

    // Load available activities (not joined)
    this.loadAvailableActivities();
  }

  private loadTodayActivities() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This would be a proper API call in a real implementation
    // For now, filter from upcoming activities
    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.todayActivities = activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate >= today && activityDate < tomorrow;
          });
        },
        error: (error) => console.error('Error loading today activities:', error)
      });
  }

  private loadAvailableActivities() {
    // This would be a proper API call to get activities user hasn't joined
    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          // For demo purposes, show all activities as available
          this.availableActivities = activities.slice(0, 3);
        },
        error: (error) => console.error('Error loading available activities:', error)
      });
  }

  private generateWeekCalendar() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayActivities = this.upcomingActivities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate.toDateString() === date.toDateString();
      });

      this.weekDays.push({
        date: date,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        activities: dayActivities
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  toggleCalendarView() {
    this.showCalendarView = !this.showCalendarView;
  }

  getUserGreeting(): string {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 18) greeting = 'Buenas tardes';
    else greeting = 'Buenas noches';
    
    const name = this.currentUser?.first_name || this.currentUser?.username || 'Usuario';
    return `${greeting}, ${name}!`;
  }

  getUserRole(): string {
    if (!this.currentUser) return 'Usuario';
    
    switch (this.currentUser.role) {
      case 'SUPERADMIN': return 'Superadministrador';
      case 'ORGANIZER': return 'Organizador';
      case 'USER': return 'Usuario';
      default: return 'Usuario';
    }
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

  getProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc ? this.authService.getProfileImageSrc() : null;
  }
}