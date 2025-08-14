import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AchievementsService } from './achievements.service';
import { GamificationState } from '../models/achivement.model';

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
export class AchievementNotificationsService {
  private gamificationStateSubject = new BehaviorSubject<GamificationState | null>(null);
  private notificationsSubject = new BehaviorSubject<AchievementNotification[]>([]);

  public gamificationState$ = this.gamificationStateSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private achievementsService: AchievementsService) {}

  /**
   * Refresh the gamification state and check for new achievements
   */
  async refreshAchievements(): Promise<void> {
    try {
      const currentState = this.gamificationStateSubject.value;
      const newState = await firstValueFrom(this.achievementsService.getGamificationState());
      
      if (newState) {
        // Check for new achievements
        if (currentState) {
          this.checkForNewAchievements(currentState, newState);
        }
        
        // Update the state
        this.gamificationStateSubject.next(newState);
      }
    } catch (error) {
      console.error('Error refreshing achievements:', error);
    }
  }

  /**
   * Check for newly earned achievements and create notifications
   */
  private checkForNewAchievements(oldState: GamificationState, newState: GamificationState): void {
    const oldAchievementIds = oldState.earned_achievements.map(ua => ua.achievement.id);
    const newAchievements = newState.earned_achievements.filter(
      ua => !oldAchievementIds.includes(ua.achievement.id)
    );

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

    // Also check for level ups
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
   * Get unshown notifications
   */
  getUnshownNotifications(): AchievementNotification[] {
    return this.notificationsSubject.value.filter(n => !n.shown);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Initialize the service by loading current gamification state
   */
  async initialize(): Promise<void> {
    try {
      const state = await firstValueFrom(this.achievementsService.getGamificationState());
      if (state) {
        this.gamificationStateSubject.next(state);
      }
    } catch (error) {
      console.error('Error initializing achievement notifications:', error);
    }
  }

  /**
   * Get current gamification state
   */
  getCurrentState(): GamificationState | null {
    return this.gamificationStateSubject.value;
  }
}