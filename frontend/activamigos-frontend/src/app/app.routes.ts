import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Landing page - first page to use
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
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [AuthGuard],
    title: 'Perfil - ActivAmigos'
  },
  
  // Groups route (protected)
  {
    path: 'groups',
    loadComponent: () => import('./features/groups/groups.component').then(m => m.GroupsComponent),
    canActivate: [AuthGuard],
    title: 'Grupos - ActivAmigos'
  },

  // Group details route (protected)
  {
    path: 'groups/:id',
    loadComponent: () => import('./features/groups/group-details/group-details.component').then(m => m.GroupDetailsComponent),
    canActivate: [AuthGuard],
    title: 'Detalles del Grupo - ActivAmigos'
  },

  // Activities route (protected)
  {
    path: 'activities',
    loadComponent: () => import('./features/activities/activities.component').then(m => m.ActivitiesComponent),
    canActivate: [AuthGuard],
    title: 'Actividades - ActivAmigos'
  },
  
  {
    path: 'achievements',
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