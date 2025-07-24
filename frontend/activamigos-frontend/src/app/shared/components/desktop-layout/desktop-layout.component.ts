import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/navitem.model';

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
    { path: '/profile', icon: '👤', label: 'Perfil' },
    { path: '/help', icon: '❓', label: 'Ayuda' }
  ];

  constructor(private router: Router) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActiveRoute(path: string): boolean {
    return this.router.url === path || 
           (path === '/dashboard' && this.router.url === '/');
  }
}