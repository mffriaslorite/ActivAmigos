import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PointsService } from '../../core/services/points.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { User } from '../../core/models/user.model';
import { Group } from '../../core/models/group.model';
import { Activity } from '../../core/models/activity.model';
import { GroupsService } from '../../core/services/groups.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { DesktopLayoutComponent } from '../../shared/components/desktop-layout/desktop-layout.component';
import { AttendanceModalComponent, ActivityToConfirm } from '../../shared/components/attendance-modal/attendance-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, DesktopLayoutComponent, AttendanceModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isLoading = false;
  currentPoints = 0;
  private destroy$ = new Subject<void>();
  
  // Today's activities
  todaysActivitiesNotJoined: Activity[] = [];
  todaysActivitiesJoined: Activity[] = [];
  
  // Upcoming content
  upcomingActivities: Activity[] = [];
  availableGroups: Group[] = [];
  
  // Calendar view
  weekDays: { date: Date; dayName: string; dayNumber: number; activities: Activity[] }[] = [];
  
  // Attendance confirmation
  showAttendanceModal = false;
  activityToConfirm: ActivityToConfirm | null = null;

  constructor(
    private authService: AuthService,
    private pointsService: PointsService,
    private attendanceService: AttendanceService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService
  ) {}

  ngOnInit() {
    // Subscribe to user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserData();
        }
      });

    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    // Subscribe to points changes
    this.pointsService.currentPoints$
      .pipe(takeUntil(this.destroy$))
      .subscribe(points => {
        this.currentPoints = points;
      });

    this.generateWeekCalendar();
    
    // Check for pending attendance confirmations
    this.checkPendingAttendanceConfirmations();
  }

  private loadUserData() {
    // Load today's activities
    this.loadTodaysActivities();
    
    // Load upcoming activities
    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        this.upcomingActivities = activities;
        this.updateWeekCalendar();
      });

    // Load available groups
    this.groupsService.getAvailableGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => this.availableGroups = groups);
  }

  private loadTodaysActivities() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    this.activitiesService.getActivitiesByDate(today)
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => {
        // Separate joined and not joined activities
        this.todaysActivitiesJoined = activities.filter(a => a.is_participant);
        this.todaysActivitiesNotJoined = activities.filter(a => !a.is_participant);
      });
  }

  private generateWeekCalendar() {
    const today = new Date();
    this.weekDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      this.weekDays.push({
        date: date,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNumber: date.getDate(),
        activities: []
      });
    }
  }

  private updateWeekCalendar() {
    this.weekDays.forEach(day => {
      day.activities = this.upcomingActivities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate.toDateString() === day.date.toDateString();
      });
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

  private checkPendingAttendanceConfirmations() {
    this.attendanceService.getPendingConfirmations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Show modal for the first pending activity
          if (response.activities.length > 0) {
            const firstPending = response.activities[0];
            this.activityToConfirm = {
              id: firstPending.activity.id,
              title: firstPending.activity.title,
              description: firstPending.activity.description,
              date: firstPending.activity.date,
              location: firstPending.activity.location
            };
            this.showAttendanceModal = true;
          }
        },
        error: (error) => {
          console.error('Error checking pending confirmations:', error);
        }
      });
  }

  onAttendanceModalClose() {
    this.showAttendanceModal = false;
    this.activityToConfirm = null;
  }

  onAttendanceConfirmed(response: any) {
    console.log('Attendance confirmed:', response);
    // Refresh pending activities
    this.attendanceService.refreshPendingActivities();
    // You might want to show a success message here
  }
}