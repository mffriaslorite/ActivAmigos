import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/navitem.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-desktop-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './desktop-layout.component.html',
    styleUrls: ['./desktop-layout.component.scss'],
})
export class DesktopLayoutComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', icon: '🏠', label: 'Inicio' },
    { path: '/groups', icon: '👥', label: 'Grupos' },
    { path: '/activities', icon: '📅', label: 'Actividades' },
    { path: '/achievements', icon: '🏆', label: 'Logros' },
    { path: '/help', icon: '❓', label: 'Ayuda' }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActiveRoute(path: string): boolean {
    return this.router.url === path || 
           (path === '/dashboard' && this.router.url === '/');
  }

  getProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc ? this.authService.getProfileImageSrc() : null;
  }
}