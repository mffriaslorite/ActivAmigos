import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss']
})
export class BottomNavComponent implements OnInit {
  currentRoute = '';

  navItems = [
    {
      path: '/dashboard',
      icon: '🏠',
      label: 'Home',
      ariaLabel: 'Ir a la página principal'
    },
    {
      path: '/activities',
      icon: '🎯',
      label: 'Activities',
      ariaLabel: 'Ver actividades disponibles'
    },
    {
      path: '/groups',
      icon: '👥',
      label: 'Groups',
      ariaLabel: 'Ver grupos disponibles'
    },
    {
      path: '/profile',
      icon: '👤',
      label: 'Profile',
      ariaLabel: 'Ver mi perfil'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Track current route for highlighting active tab
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Set initial route
    this.currentRoute = this.router.url;
  }

  isActive(path: string): boolean {
    return this.currentRoute.startsWith(path);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}