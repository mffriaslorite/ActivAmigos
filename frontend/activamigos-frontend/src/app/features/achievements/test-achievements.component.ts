import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AchievementsService } from '../../core/services/achievements.service';
import { AchievementNotificationsSimpleService, AchievementNotification } from '../../core/services/achievement-notifications-simple.service';
import { GamificationState } from '../../core/models/achievement.model';

@Component({
  selector: 'app-test-achievements',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Achievement System Debug</h1>
      
      <!-- Current State Display -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Current Gamification State</h2>
        <div *ngIf="gamificationState" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded">
            <div class="text-2xl font-bold text-blue-600">{{gamificationState.points}}</div>
            <div class="text-sm text-gray-600">Points</div>
          </div>
          <div class="bg-green-50 p-4 rounded">
            <div class="text-2xl font-bold text-green-600">{{gamificationState.level}}</div>
            <div class="text-sm text-gray-600">Level</div>
          </div>
          <div class="bg-purple-50 p-4 rounded">
            <div class="text-2xl font-bold text-purple-600">{{gamificationState.earned_achievements.length}}</div>
            <div class="text-sm text-gray-600">Achievements</div>
          </div>
        </div>
        <div *ngIf="!gamificationState" class="text-gray-500">
          Loading gamification state...
        </div>
      </div>

      <!-- Test Buttons -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Test Actions</h2>
        <div class="flex flex-wrap gap-3">
          <button 
            (click)="addTestPoints()"
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            Add 50 Points
          </button>
          <button 
            (click)="checkAllAchievements()"
            class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">
            Check All Achievements
          </button>
          <button 
            (click)="refreshState()"
            class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition">
            Refresh State
          </button>
          <button 
            (click)="clearNotifications()"
            class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">
            Clear Notifications
          </button>
        </div>
      </div>

      <!-- Active Notifications -->
      <div class="bg-white rounded-lg shadow p-6 mb-6" *ngIf="notifications.length > 0">
        <h2 class="text-lg font-semibold mb-4">Active Notifications</h2>
        <div class="space-y-3">
          <div *ngFor="let notification of notifications" 
               class="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
            <div class="font-semibold text-yellow-800">🏆 {{notification.title}}</div>
            <div class="text-sm text-yellow-700 mt-1">{{notification.description}}</div>
            <div class="text-xs text-yellow-600 mt-2">
              {{notification.points > 0 ? '+' + notification.points + ' points' : ''}} 
              • {{notification.timestamp | date:'short'}}
            </div>
            <button 
              (click)="dismissNotification(notification.id)"
              class="mt-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-300 transition">
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <!-- Earned Achievements -->
      <div class="bg-white rounded-lg shadow p-6" *ngIf="gamificationState?.earned_achievements.length">
        <h2 class="text-lg font-semibold mb-4">Earned Achievements</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let userAchievement of gamificationState.earned_achievements" 
               class="border rounded-lg p-4 bg-green-50 border-green-200">
            <div class="font-semibold text-green-800">{{userAchievement.achievement.title}}</div>
            <div class="text-sm text-green-700 mt-1">{{userAchievement.achievement.description}}</div>
            <div class="text-xs text-green-600 mt-2">
              +{{userAchievement.achievement.points_reward}} points • 
              {{userAchievement.date_earned | date:'short'}}
            </div>
          </div>
        </div>
      </div>

      <!-- Debug Log -->
      <div class="bg-gray-900 text-gray-100 rounded-lg p-4 mt-6">
        <h3 class="text-sm font-semibold mb-2">Debug Log</h3>
        <div class="text-xs space-y-1 max-h-40 overflow-y-auto">
          <div *ngFor="let log of debugLogs" class="font-mono">
            <span class="text-gray-400">{{log.timestamp | date:'HH:mm:ss'}}</span>
            <span class="ml-2">{{log.message}}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TestAchievementsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  gamificationState: GamificationState | null = null;
  notifications: AchievementNotification[] = [];
  debugLogs: Array<{timestamp: Date, message: string}> = [];

  constructor(
    private achievementsService: AchievementsService,
    private notificationsService: AchievementNotificationsSimpleService
  ) {}

  ngOnInit(): void {
    this.log('TestAchievementsComponent initialized');
    
    // Subscribe to gamification state changes
    this.notificationsService.gamificationState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.gamificationState = state;
        this.log(`Gamification state updated: Level ${state?.level}, Points ${state?.points}`);
      });

    // Subscribe to notifications
    this.notificationsService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications.filter(n => !n.shown);
        this.log(`Notifications updated: ${notifications.length} total, ${this.notifications.length} active`);
      });

    // Initialize the service
    this.notificationsService.initialize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTestPoints(): void {
    this.log('Adding 50 test points...');
    this.achievementsService.addPoints(50).subscribe({
      next: (newState) => {
        this.log(`Points added successfully. New total: ${newState.points}`);
        this.notificationsService.refreshAchievements();
      },
      error: (error) => {
        this.log(`Error adding points: ${error.message || error}`);
      }
    });
  }

  checkAllAchievements(): void {
    this.log('Checking all achievements...');
    this.achievementsService.checkAllAchievements().subscribe({
      next: (newState) => {
        this.log(`All achievements checked. Total achievements: ${newState.earned_achievements.length}`);
        this.notificationsService.refreshAchievements();
      },
      error: (error) => {
        this.log(`Error checking achievements: ${error.message || error}`);
      }
    });
  }

  refreshState(): void {
    this.log('Refreshing gamification state...');
    this.notificationsService.refreshAchievements();
  }

  clearNotifications(): void {
    this.log('Clearing all notifications...');
    this.notificationsService.clearAllNotifications();
  }

  dismissNotification(notificationId: string): void {
    this.log(`Dismissing notification: ${notificationId}`);
    this.notificationsService.removeNotification(notificationId);
  }

  private log(message: string): void {
    console.log(`[TestAchievements] ${message}`);
    this.debugLogs.unshift({
      timestamp: new Date(),
      message: message
    });
    
    // Keep only last 20 logs
    if (this.debugLogs.length > 20) {
      this.debugLogs = this.debugLogs.slice(0, 20);
    }
  }
}