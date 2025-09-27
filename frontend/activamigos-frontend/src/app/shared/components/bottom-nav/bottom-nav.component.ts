import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavItem } from '../../../core/models/navitem.model';
import { AuthService } from '../../../core/services/auth.service';
import { SemaphoreBadgeComponent } from '../semaphore-badge/semaphore-badge.component';


@Component({
    selector: 'app-bottom-nav',
    standalone: true,
    imports: [CommonModule, RouterModule, SemaphoreBadgeComponent],
    templateUrl: './bottom-nav.component.html',
    styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/activities', icon: '📅', label: 'Activities' },
    { path: '/groups', icon: '👥', label: 'Groups' },
    { path: '/profile', icon: '👤', label: 'Profile' }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActiveRoute(path: string): boolean {
    return this.router.url === path || 
           (path === '/dashboard' && this.router.url === '/');
  }

  getUserSemaphoreColor(): string {
    // This would ideally come from a service that tracks user's overall status
    // For now, return a default color
    return 'light_green';
  }

  getUserWarningCount(): number {
    // This would come from the user's total warning count across all contexts
    return 0;
  }
}