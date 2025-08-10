import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AchievementsService } from '../../core/services/achievements.service';
import { AuthService } from '../../core/services/auth.service';
import { GamificationState, Achievement } from '../../core/models/achievement.model';
import { User } from '../../core/models/user.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { LevelProgressBarComponent } from '../../shared/components/level-progress-bar/level-progress-bar.component';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [
    CommonModule,
    BottomNavComponent,
    LevelProgressBarComponent
  ],
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss']
})
export class AchievementsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  gamificationState: GamificationState | null = null;
  allAchievements: Achievement[] = [];
  isLoadingGamification = false;
  isLoadingAchievements = false;
  private destroy$ = new Subject<void>();

  constructor(
    private achievementsService: AchievementsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    this.loadGamificationState();
    this.loadAllAchievements();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGamificationState() {
    this.isLoadingGamification = true;
    this.achievementsService.getGamificationState()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.gamificationState = state;
          this.isLoadingGamification = false;
        },
        error: (error) => {
          console.error('Error loading gamification state:', error);
          this.isLoadingGamification = false;
        }
      });
  }

  loadAllAchievements() {
    this.isLoadingAchievements = true;
    this.achievementsService.getAllAchievements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (achievements) => {
          this.allAchievements = achievements;
          this.isLoadingAchievements = false;
        },
        error: (error) => {
          console.error('Error loading achievements:', error);
          this.isLoadingAchievements = false;
        }
      });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  getAchievementIconUrl(achievementId: number): string {
    return this.achievementsService.getAchievementIconUrl(achievementId);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  isAchievementEarned(achievementId: number): boolean {
    return this.gamificationState?.earned_achievements?.some(
      userAchievement => userAchievement.achievement.id === achievementId
    ) || false;
  }

  getEarnedDate(achievementId: number): string | null {
    const userAchievement = this.gamificationState?.earned_achievements?.find(
      userAchievement => userAchievement.achievement.id === achievementId
    );
    return userAchievement ? userAchievement.date_earned : null;
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

  checkAllAchievements() {
    this.isLoadingGamification = true;
    this.achievementsService.checkAllAchievements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          this.gamificationState = state;
          this.isLoadingGamification = false;
          // Show success message or notification
          console.log('✅ Achievements checked and updated!');
        },
        error: (error) => {
          console.error('Error checking achievements:', error);
          this.isLoadingGamification = false;
        }
      });
  }
}