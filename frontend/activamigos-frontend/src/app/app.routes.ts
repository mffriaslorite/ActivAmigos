import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page - first page users see
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
    title: 'ActivAmigos - Conecta, Actívate y Haz Amigos'
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
    canActivate: [AuthGuard],
    title: 'Dashboard - ActivAmigos'
  },
  
  // Profile route (protected)
  {
    path: 'profile',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    title: 'Perfil - ActivAmigos'
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
