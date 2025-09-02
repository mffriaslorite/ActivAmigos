import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AchievementNotificationComponent } from '../achievement-notification/achievement-notification.component';
import { 
  AchievementNotificationsSimpleService, 
  AchievementNotification 
} from '../../../core/services/achievement-notifications-simple.service';

@Component({
  selector: 'app-achievement-notifications-container',
  standalone: true,
  imports: [CommonModule, AchievementNotificationComponent],
  template: `
    <div class="notifications-container">
      <app-achievement-notification
        *ngFor="let notification of visibleNotifications; trackBy: trackByNotificationId"
        [notification]="notification"
        [autoDismiss]="true"
        [dismissAfter]="5000"
        [style.--notification-index]="getNotificationIndex(notification.id)"
        (dismiss)="onNotificationDismiss($event)"
        (click)="onNotificationClick($event)"
        class="notification-item"
      ></app-achievement-notification>
    </div>
  `,
  styleUrls: ['./achievement-notification-container.component.scss']
})
export class AchievementNotificationsContainerComponent implements OnInit, OnDestroy {
  visibleNotifications: AchievementNotification[] = [];
  private destroy$ = new Subject<void>();
  private readonly MAX_VISIBLE_NOTIFICATIONS = 3;

  constructor(
    private notificationService: AchievementNotificationsSimpleService
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        // Filter to only show unshown notifications
        const newNotifications = notifications.filter(n => !n.shown);
        
        // Limit the number of visible notifications to prevent UI overflow
        this.visibleNotifications = newNotifications.slice(0, this.MAX_VISIBLE_NOTIFICATIONS);
        
        console.log('📢 Notifications container updated:', {
          totalNotifications: notifications.length,
          visibleNotifications: this.visibleNotifications.length,
          notificationTitles: this.visibleNotifications.map(n => n.title),
          isMobile: window.innerWidth <= 768,
          viewport: { width: window.innerWidth, height: window.innerHeight }
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNotificationDismiss(notificationId: string): void {
    console.log('🗑️ Dismissing notification:', notificationId);
    
    // Remove from visible notifications immediately for smooth UX
    this.visibleNotifications = this.visibleNotifications.filter(n => n.id !== notificationId);
    
    // Remove from the service
    this.notificationService.removeNotification(notificationId);
  }

  onNotificationClick(notification: AchievementNotification): void {
    console.log('👆 Notification clicked:', notification.title);
    
    // Optional: Navigate to achievements page or show more details
    // For now, we'll just dismiss the notification
    this.onNotificationDismiss(notification.id);
  }

  trackByNotificationId(index: number, notification: AchievementNotification): string {
    return notification.id;
  }

  getNotificationIndex(notificationId: string): number {
    return this.visibleNotifications.findIndex(n => n.id === notificationId);
  }
}