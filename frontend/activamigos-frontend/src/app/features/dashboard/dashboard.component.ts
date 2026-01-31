import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PointsService } from '../../core/services/points.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { UserStatusService } from '../../core/services/user-status.service';
import { User } from '../../core/models/user.model';
import { Group } from '../../core/models/group.model';
import { Activity } from '../../core/models/activity.model';
import { GroupsService } from '../../core/services/groups.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { DesktopLayoutComponent } from '../../shared/components/desktop-layout/desktop-layout.component';
import { AttendanceModalComponent, ActivityToConfirm } from '../../shared/components/attendance-modal/attendance-modal.component';
import { SemaphoreBadgeComponent } from '../../shared/components/semaphore-badge/semaphore-badge.component';
import { AchievementNotificationsSimpleService } from '../../core/services/achievement-notifications-simple.service';
import { TutorialModalComponent } from '../../shared/components/tutorial-modal/tutorial-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, DesktopLayoutComponent, AttendanceModalComponent, SemaphoreBadgeComponent, TutorialModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  
  // Estado de carga específico para el contenido (para mostrar skeletons)
  isLoadingContent = true;
  
  currentPoints = 0;
  private destroy$ = new Subject<void>();
  
  // Actividades
  todaysActivitiesNotJoined: Activity[] = [];
  todaysActivitiesJoined: Activity[] = [];
  upcomingActivities: Activity[] = [];
  
  // Grupos
  availableGroups: Group[] = [];
  
  // Calendario
  weekDays: { date: Date; dayName: string; dayNumber: number; activities: Activity[] }[] = [];
  
  // Modales
  showAttendanceModal = false;
  showTutorialModal = false;
  activityToConfirm: ActivityToConfirm | null = null;
  
  // Status
  userSemaphoreColor: 'grey' | 'light_green' | 'dark_green' | 'yellow' | 'red' = 'light_green';
  userWarningCount = 0;

  today = new Date();
  hasUnreadNotifications = false;

  constructor(
    private authService: AuthService,
    private pointsService: PointsService,
    private attendanceService: AttendanceService,
    private userStatusService: UserStatusService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService,
    private notificationService: AchievementNotificationsSimpleService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadAllDashboardData();
        }
      });

    this.pointsService.currentPoints$
      .pipe(takeUntil(this.destroy$))
      .subscribe(points => this.currentPoints = points);
    
    this.userStatusService.userStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.userSemaphoreColor = status.overall_semaphore_color;
        this.userWarningCount = status.total_warnings;
      });

    this.notificationService.hasUnreadAchievements$
      .pipe(takeUntil(this.destroy$))
      .subscribe(hasUnread => {
        this.hasUnreadNotifications = hasUnread;
      });

    this.generateWeekCalendar();
  }

  /**
   * Carga todos los datos en paralelo y maneja errores individualmente
   * para que una fallo no deje el dashboard vacío.
   */
  private loadAllDashboardData() {
    this.isLoadingContent = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    forkJoin({
      todaysActivities: this.activitiesService.getActivitiesByDate(today).pipe(catchError(() => of([]))),
      upcoming: this.activitiesService.getUpcomingActivities().pipe(catchError(() => of([]))),
      groups: this.groupsService.getAvailableGroups().pipe(catchError(() => of([]))),
      pendingConfirmations: this.attendanceService.getPendingConfirmations().pipe(catchError(() => of(null)))
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoadingContent = false) // Siempre apagar el loading al final
    )
    .subscribe(({ todaysActivities, upcoming, groups, pendingConfirmations }) => {
      this.todaysActivitiesJoined = todaysActivities.filter(a => a.is_participant);
      this.todaysActivitiesNotJoined = todaysActivities.filter(a => !a.is_participant);

      this.upcomingActivities = upcoming;
      this.updateWeekCalendar();

      this.availableGroups = groups;

      if (pendingConfirmations) {
        this.checkAttendance(pendingConfirmations);
      }
    });
  }

  // --- Helpers de Calendario ---
  private generateWeekCalendar() {
    const today = new Date();
    this.weekDays = [];
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      this.weekDays.push({
        date: date,
        dayName: dayNames[date.getDay()],
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

  isToday(date: Date): boolean {
    return date.toDateString() === this.today.toDateString();
  }

  // --- Navegación y Acciones ---
  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  goToActivities(id: number | null = null) {
    this.router.navigate(id ? ['/activities', id] : ['/activities']);
  }

  goToGroups(id: number | null = null) {
    this.router.navigate(id ? ['/groups', id] : ['/groups']);
  }

  // --- Helpers Visuales ---
  formatActivityDate(dateString: string): string {
    if (!dateString) return '';
    const targetDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(targetDate);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const targetDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(targetDate);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getActivityEmoji(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('fútbol') || t.includes('deporte')) return '⚽';
    if (t.includes('cocina') || t.includes('pastel')) return '🍳';
    if (t.includes('pintura') || t.includes('arte')) return '🎨';
    if (t.includes('música') || t.includes('baile')) return '🎵';
    if (t.includes('cine')) return '🎬';
    if (t.includes('lectura')) return '📚';
    return '🌟';
  }

  getProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc ? this.authService.getProfileImageSrc() : null;
  }

  // --- Lógica de Asistencia ---
  openAttendanceModal(activity: Activity) {
    this.activityToConfirm = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      date: activity.date,
      location: activity.location
    };
    this.showAttendanceModal = true;
  }

  onAttendanceModalClose() {
    if (this.activityToConfirm) {
      this.attendanceService.setCooldown(this.activityToConfirm.id, this.activityToConfirm.date);
    }
    this.showAttendanceModal = false;
    this.activityToConfirm = null;
  }

  private checkAttendance(response: any) {
    const activityToShow = response.activities.find((item: any) => 
      this.attendanceService.shouldShowAttendanceModal(item.activity.id, item.activity.date)
    );
    
    if (activityToShow) {
      const activityId = activityToShow.activity.id;
      const hasSeenModal = sessionStorage.getItem(`seen_attendance_${activityId}`);

      if (!hasSeenModal) {
        this.openAttendanceModal(activityToShow.activity);
        sessionStorage.setItem(`seen_attendance_${activityId}`, 'true');
      }
    }
  }

  getActivityStatus(activity: any): string {
    if (!activity.is_participant) return 'not_participant';
    
    if (activity.attendance_status) {
      return activity.attendance_status;
    }
    
    return 'pending';
  }

  onAttendanceConfirmed(willAttend: boolean) {
    this.showAttendanceModal = false;
    const activityId = this.activityToConfirm?.id;
    this.activityToConfirm = null;

    if (activityId) {
      const activity = this.todaysActivitiesJoined.find(a => a.id === activityId);
      
      if (activity) {
        activity.attendance_confirmed = true;
        (activity as any).attendance_status = willAttend ? 'confirmed' : 'declined';
      }
    }
    
    setTimeout(() => {
      this.loadAllDashboardData();
    }, 1000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Calcula el Nivel Siguiente al que aspira el usuario.
   * Fórmula: (Puntos / 100) + 1 es el nivel actual, así que + 2 es el siguiente.
   */
  get nextLevel(): number {
    return Math.floor(this.currentPoints / 100) + 2;
  }

  /**
   * Calcula los puntos que faltan para subir.
   * Fórmula: 100 - (Puntos sobrantes del nivel actual).
   */
  get pointsToNextLevel(): number {
    return 100 - (this.currentPoints % 100);
  }

  get pointsInCurrentLevel(): number {
    return this.currentPoints % 100;
  }
}