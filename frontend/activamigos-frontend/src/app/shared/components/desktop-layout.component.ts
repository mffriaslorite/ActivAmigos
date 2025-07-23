import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-desktop-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Desktop Layout - Only shown on large screens -->
    <div class="hidden lg:flex lg:fixed lg:inset-y-0 lg:z-50 lg:w-72">
      <!-- Sidebar -->
      <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 border-r border-gray-200">
        <div class="flex h-16 shrink-0 items-center">
          <h1 class="text-2xl font-bold text-blue-600">ActivAmigos</h1>
        </div>
        <nav class="flex flex-1 flex-col">
          <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" class="-mx-2 space-y-1">
                <li *ngFor="let item of navItems">
                  <button
                    (click)="navigateTo(item.path)"
                    [class.bg-blue-50]="isActiveRoute(item.path)"
                    [class.text-blue-700]="isActiveRoute(item.path)"
                    [class.text-gray-700]="!isActiveRoute(item.path)"
                    [class.hover:text-blue-700]="!isActiveRoute(item.path)"
                    [class.hover:bg-blue-50]="!isActiveRoute(item.path)"
                    class="group flex gap-x-3 rounded-md p-3 text-sm font-semibold leading-6 w-full text-left transition-colors duration-200"
                  >
                    <span class="text-xl">{{ item.icon }}</span>
                    {{ item.label }}
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `,
  styles: [`
    /* Component-specific styles can be added here */
  `]
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