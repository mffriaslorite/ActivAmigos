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
  
  // Future feature routes (protected)
  {
    path: 'groups',
    loadChildren: () => import('./features/groups/groups.routes').then(m => m.groupRoutes),
    canActivate: [AuthGuard]
  },
  
  {
    path: 'activities',
    loadChildren: () => import('./features/activities/activities.routes').then(m => m.activityRoutes),
    canActivate: [AuthGuard]
  },
  
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  
  // Help routes (public)
  {
    path: 'help',
    loadChildren: () => import('./features/help/help.routes').then(m => m.helpRoutes)
  },
  
  // Catch-all route
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found.component').then(m => m.NotFoundComponent)
  }
];
