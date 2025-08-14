import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AchievementNotificationComponent } from './shared/components/achievement-notification/achievement-notification.component';
import { AchievementNotificationsService } from './core/services/achievement-notifications.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AchievementNotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('activamigos-frontend');

  constructor(private achievementNotifications: AchievementNotificationsService) {}

  ngOnInit() {
    // Initialize the achievement notifications service
    this.achievementNotifications.initialize();
  }
}