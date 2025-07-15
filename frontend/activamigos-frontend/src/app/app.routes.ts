import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Redirect root to dashboard or login
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Authentication routes (lazy loaded)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  
  // Protected routes
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  
  // Profile route (protected)
  {
    path: 'profile',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  
  // Placeholder routes for future sprints
  {
    path: 'groups',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  {
    path: 'activities', 
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  {
    path: 'help',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Catch-all route
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found.component').then(m => m.NotFoundComponent)
  }
];
