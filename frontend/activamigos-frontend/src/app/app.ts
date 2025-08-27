import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AchievementNotificationsContainerComponent } from './shared/components/achievement-notification-container/achievement-notification-container.component';
import { AchievementNotificationsSimpleService } from './core/services/achievement-notifications-simple.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AchievementNotificationsContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('activamigos-frontend');

  constructor(private achievementNotifications: AchievementNotificationsSimpleService) {}

  ngOnInit() {
    // Initialize the achievement notifications service
    this.achievementNotifications.initialize();
  }
}