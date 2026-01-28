import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/navitem.model';
import { AchievementNotificationsSimpleService } from '../../../core/services/achievement-notifications-simple.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './bottom-nav.component.html',
    styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent implements OnInit {
  navItems: NavItem[] = [
    { path: '/dashboard', icon: '🏠', label: 'Inicio' },
    { path: '/activities', icon: '📅', label: 'Actividades' },
    { path: '/groups', icon: '👥', label: 'Grupos' },
    { path: '/achievements', icon: '🏆', label: 'Logros' },
    { path: '/profile', icon: '👤', label: 'Perfil' }
  ];

  hasNewNotification = false;
  userProfileImage: string | null = null;

  constructor(
    private router: Router,
    private notificationService: AchievementNotificationsSimpleService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // 1. Notificaciones (Punto Rojo)
    this.notificationService.hasUnreadAchievements$.subscribe(hasUnread => {
      this.hasNewNotification = hasUnread;
    });

    // 2. Foto de Perfil (Suscribirse a cambios)
    this.authService.currentUser$.subscribe(() => {
        this.userProfileImage = this.authService.getProfileImageSrc();
    });
  }

  isActive(route: string): boolean {
    const active = this.router.url === route;
    if (active && route === '/profile' && this.hasNewNotification) {
      this.notificationService.clearNotification();
    }
    return active;
  }
}