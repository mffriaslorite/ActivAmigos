import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Bottom Navigation -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20 safe-area-bottom">
      <div class="flex justify-around items-center max-w-md mx-auto">
        <button 
          *ngFor="let item of navItems"
          class="nav-item flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200"
          [class.active]="isActiveRoute(item.path)"
          (click)="navigateTo(item.path)"
          [attr.aria-label]="item.label"
        >
          <span class="text-2xl mb-1">{{ item.icon }}</span>
          <span class="text-xs font-medium">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- Desktop Side Navigation (Future Enhancement) -->
    <!-- This would be implemented in a full desktop layout component -->
  `,
  styles: [`
    .nav-item {
      min-width: 60px;
      color: #6b7280;
      transition: color 0.2s ease-in-out;
    }

    .nav-item:hover {
      color: #3b82f6;
      background-color: #eff6ff;
    }

    .nav-item.active {
      color: #3b82f6;
      background-color: #eff6ff;
    }

    .nav-item.active span:first-child {
      transform: scale(1.1);
    }

    /* Safe area for devices with home indicators */
    .safe-area-bottom {
      padding-bottom: max(8px, env(safe-area-inset-bottom));
    }

    /* Desktop responsive behavior */
    @media (min-width: 1024px) {
      /* Hide mobile navigation on desktop */
      nav {
        display: none;
      }
    }
  `]
})
export class BottomNavComponent {
  navItems: NavItem[] = [
    { path: '/dashboard', icon: '🏠', label: 'Inicio' },
    { path: '/activities', icon: '📅', label: 'Actividades' },
    { path: '/groups', icon: '👥', label: 'Grupos' },
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