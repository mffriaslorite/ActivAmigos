import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/navitem.model';
import { AchievementNotificationsSimpleService } from '../../../core/services/achievement-notifications-simple.service';


@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './bottom-nav.component.html',
    styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', icon: '🏠', label: 'Inicio' },
    { path: '/activities', icon: '📅', label: 'Actividades' },
    { path: '/groups', icon: '👥', label: 'Grupos' },
    { path: '/achievements', icon: '🏆', label: 'Logros' },
    { path: '/help', icon: '❓', label: 'Ayuda' }
  ];

  // Estado del punto rojo
  hasNewNotification = false;

  constructor(
    private router: Router,
    private notificationService: AchievementNotificationsSimpleService
  ) {}

  ngOnInit() {
    // Escuchamos si hay novedades para encender el punto rojo
    this.notificationService.hasUnreadAchievements$.subscribe(hasUnread => {
      this.hasNewNotification = hasUnread;
    });
  }

  isActive(route: string): boolean {
    const active = this.router.url === route;
    
    // Si el usuario entra en el perfil, apagamos la notificación
    if (active && route === '/profile' && this.hasNewNotification) {
      this.notificationService.clearNotification();
    }
    return active;
  }
}