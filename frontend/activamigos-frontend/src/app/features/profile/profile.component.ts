import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { Group } from '../../core/models/group.model';
import { Activity } from '../../core/models/activity.model';
import { GamificationState } from '../../core/models/achivement.model';
import { GroupsService } from '../../core/services/groups.service';
import { ActivitiesService } from '../../core/services/activities.service';
import { AchievementService } from '../../core/services/achievements.service';
import { UserStatusService } from '../../core/services/user-status.service';

import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { DesktopLayoutComponent } from '../../shared/components/desktop-layout/desktop-layout.component';
import { LevelProgressBarComponent } from '../../shared/components/level-progress-bar/level-progress-bar.component';
import { SemaphoreBadgeComponent } from '../../shared/components/semaphore-badge/semaphore-badge.component';
import { ProfileEditModalComponent } from './edit-profile-modal/edit-profile-modal.component';
import { PasswordChangeModalComponent } from './password-change-modal/password-change-modal.component';
import { AchievementNotificationsSimpleService } from '../../core/services/achievement-notifications-simple.service';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
      CommonModule, 
      BottomNavComponent, 
      DesktopLayoutComponent,
      LevelProgressBarComponent,
      SemaphoreBadgeComponent,
      ProfileEditModalComponent, 
      PasswordChangeModalComponent
    ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();
  
  userGroups: Group[] = [];
  upcomingActivities: Activity[] = [];
  
  gamificationState: GamificationState | null = null;
  semaphoreColor: string = 'grey';
  warningCount: number = 0;
  
  isLoadingAchievements = false;
  showEditModal = false;
  showPasswordModal = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService,
    private achievementsService: AchievementService,
    private userStatusService: UserStatusService,
    private notificationService: AchievementNotificationsSimpleService
  ) {}

  ngOnInit() {
    this.notificationService.clearNotification();
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.currentUser = user);

    this.userStatusService.userStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.semaphoreColor = status.overall_semaphore_color;
        this.warningCount = status.total_warnings;
      });

    this.groupsService.getUserGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => this.userGroups = groups);

    this.activitiesService.getUpcomingActivities()
      .pipe(takeUntil(this.destroy$))
      .subscribe(activities => this.upcomingActivities = activities);

    this.loadGamificationState();
  }

  loadGamificationState() {
    this.isLoadingAchievements = true;
    this.achievementsService.getGamificationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.gamificationState = state;
          this.isLoadingAchievements = false;
        },
        error: (error) => {
          console.error('Error loading gamification state:', error);
          this.isLoadingAchievements = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() { this.router.navigate(['/dashboard']); }

  navigateTo(path: string) {
    if (path === '/notifications' || path === '/privacy') alert('Próximamente');
    else this.router.navigate([path]);
  }

  editProfile() { this.showEditModal = true; }
  onEditModalClose() { this.showEditModal = false; }
  onProfileUpdated(updatedUser: User) { this.currentUser = updatedUser; }

  changePassword() { this.showPasswordModal = true; }
  onPasswordModalClose() { this.showPasswordModal = false; }
  onPasswordChanged() { console.log('Password changed'); }

  getDisplayName(): string {
    if (!this.currentUser) return 'Cargando...';
    const { first_name, last_name, username } = this.currentUser;
    if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
    return username || 'Usuario';
  }

  getUserProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc() || null;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  logout() {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.router.navigate(['/auth/login']));
  }
}