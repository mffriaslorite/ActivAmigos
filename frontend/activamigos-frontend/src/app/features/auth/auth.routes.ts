import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    title: 'Login - ActivAmigos'
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    title: 'Register - ActivAmigos'
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];