import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { 
  AchievementNotificationsService, 
  AchievementNotification 
} from '../../../core/services/achievement-notifications.service';

@Component({
  selector: 'app-achievement-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievement-notification.component.html',
  styleUrls: ['./achievement-notification.component.scss']
})
export class AchievementNotificationComponent implements OnInit, OnDestroy {
  notifications: AchievementNotification[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: AchievementNotificationsService) {}

  ngOnInit() {
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications.filter(n => !n.shown);
        
        // Auto-hide notifications after 5 seconds
        notifications.forEach(notification => {
          if (!notification.shown) {
            setTimeout(() => {
              this.hideNotification(notification.id);
            }, 5000);
          }
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hideNotification(notificationId: string) {
    this.notificationService.markNotificationShown(notificationId);
  }

  removeNotification(notificationId: string) {
    this.notificationService.removeNotification(notificationId);
  }

  trackByNotificationId(index: number, notification: AchievementNotification): string {
    return notification.id;
  }
}