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
import { AchievementsService } from '../../core/services/achievements.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { LevelProgressBarComponent } from '../../shared/components/level-progress-bar/level-progress-bar.component';
import { ProfileEditModalComponent } from './edit-profile-modal/edit-profile-modal.component';
import { PasswordChangeModalComponent } from './password-change-modal/password-change-modal.component';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
      CommonModule, 
      BottomNavComponent, 
      LevelProgressBarComponent,
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
  isLoadingAchievements = false;
  
  // Modal states
  showEditModal = false;
  showPasswordModal = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private groupsService: GroupsService,
    private activitiesService: ActivitiesService,
    private achievementsService: AchievementsService
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
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

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  navigateTo(path: string) {
    if (path === '/settings') {
      this.router.navigate(['/settings/accessibility']);
    } else if (path === '/notifications' || path === '/privacy') {
      alert('Funcionalidad próximamente');
    } else {
      this.router.navigate([path]);
    }
  }

  editProfile() {
    this.showEditModal = true;
  }

  changePassword() {
    this.showPasswordModal = true;
  }

  onProfileUpdated(updatedUser: User) {
    this.currentUser = updatedUser;
  }

  onPasswordChanged() {
    // Optionally show a success message or perform additional actions
    console.log('Password changed successfully');
  }

  onEditModalClose() {
    this.showEditModal = false;
  }

  onPasswordModalClose() {
    this.showPasswordModal = false;
  }

  getDisplayName(): string {
    if (!this.currentUser) return '';
    
    const firstName = this.currentUser.first_name || '';
    const lastName = this.currentUser.last_name || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return this.currentUser.username || 'Usuario';
  }

  getProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc ? this.authService.getProfileImageSrc() : null;
  }

  getAchievementIconUrl(achievementId: number): string {
    return this.achievementsService.getAchievementIconUrl(achievementId);
  }

  formatDate(dateString: string): string {
    // Asegurar que la fecha se interprete correctamente
    let date: Date;
    
    if (dateString.endsWith('Z') || dateString.includes('+')) {
      // Ya tiene información de zona horaria
      date = new Date(dateString);
    } else {
      // Asumir que es UTC y añadir 'Z'
      date = new Date(dateString + (dateString.includes('T') ? 'Z' : 'T00:00:00Z'));
    }
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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