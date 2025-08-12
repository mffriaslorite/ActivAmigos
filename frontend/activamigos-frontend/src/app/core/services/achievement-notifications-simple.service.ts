import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AchievementsService } from './achievements.service';
import { GamificationState } from '../models/achievement.model';

export interface AchievementNotification {
  id: string;
  title: string;
  description: string;
  points: number;
  timestamp: Date;
  shown: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AchievementNotificationsSimpleService {
  private gamificationStateSubject = new BehaviorSubject<GamificationState | null>(null);
  private notificationsSubject = new BehaviorSubject<AchievementNotification[]>([]);

  public gamificationState$ = this.gamificationStateSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private achievementsService: AchievementsService) {}

  /**
   * Refresh the gamification state
   */
  refreshAchievements(): void {
    console.log('🔄 Refreshing achievements...');
    this.achievementsService.getGamificationState().subscribe({
      next: (newState) => {
        if (newState) {
          const currentState = this.gamificationStateSubject.value;
          
          console.log('📊 Achievement state refreshed:', {
            hasCurrentState: !!currentState,
            newPoints: newState.points,
            newLevel: newState.level,
            newAchievements: newState.earned_achievements.length
          });
          
          // Check for new achievements if we had a previous state
          if (currentState) {
            this.checkForNewAchievements(currentState, newState);
          }
          
          // Update the state
          this.gamificationStateSubject.next(newState);
        }
      },
      error: (error) => {
        console.error('Error refreshing achievements:', error);
      }
    });
  }

  /**
   * Check for newly earned achievements and create notifications
   */
  private checkForNewAchievements(oldState: GamificationState, newState: GamificationState): void {
    const oldAchievementIds = oldState.earned_achievements.map(ua => ua.achievement.id);
    const newAchievements = newState.earned_achievements.filter(
      ua => !oldAchievementIds.includes(ua.achievement.id)
    );

    console.log('🔍 Checking for new achievements:', {
      oldCount: oldState.earned_achievements.length,
      newCount: newState.earned_achievements.length,
      newAchievements: newAchievements.length
    });

    // Create notifications for new achievements
    newAchievements.forEach(userAchievement => {
      const notification: AchievementNotification = {
        id: `achievement_${userAchievement.achievement.id}_${Date.now()}`,
        title: userAchievement.achievement.title,
        description: userAchievement.achievement.description,
        points: userAchievement.achievement.points_reward,
        timestamp: new Date(),
        shown: false
      };

      this.addNotification(notification);
    });

    // Check for level ups
    if (newState.level > oldState.level) {
      const levelNotification: AchievementNotification = {
        id: `level_${newState.level}_${Date.now()}`,
        title: `¡Nivel ${newState.level} alcanzado!`,
        description: `¡Felicidades! Has subido al nivel ${newState.level}. ¡Sigue así!`,
        points: 0,
        timestamp: new Date(),
        shown: false
      };

      this.addNotification(levelNotification);
    }
  }

  /**
   * Add a new notification
   */
  private addNotification(notification: AchievementNotification): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
    
    console.log('🏆 Achievement earned:', notification.title);
  }

  /**
   * Mark a notification as shown
   */
  markNotificationShown(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, shown: true } : n
    );
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Remove a notification
   */
  removeNotification(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const filteredNotifications = notifications.filter(n => n.id !== notificationId);
    this.notificationsSubject.next(filteredNotifications);
  }

  /**
   * Initialize the service by loading current gamification state
   */
  initialize(): void {
    this.achievementsService.getGamificationState().subscribe({
      next: (state) => {
        if (state) {
          this.gamificationStateSubject.next(state);
        }
      },
      error: (error) => {
        console.error('Error initializing achievement notifications:', error);
      }
    });
  }

  /**
   * Get current gamification state
   */
  getCurrentState(): GamificationState | null {
    return this.gamificationStateSubject.value;
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }
}