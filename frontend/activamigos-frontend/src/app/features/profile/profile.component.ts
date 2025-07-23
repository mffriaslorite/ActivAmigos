import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BottomNavComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <!-- Header -->
      <header class="bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 shadow-sm">
        <div class="flex items-center space-x-4">
          <button 
            class="text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
            (click)="goBack()"
          >
            ←
          </button>
          <h1 class="text-xl font-bold text-gray-900">Perfil</h1>
        </div>
        <button 
          class="text-2xl p-2 hover:bg-gray-100 rounded-full transition-colors"
          (click)="editProfile()"
        >
          ✏️
        </button>
      </header>

      <!-- Main Content -->
      <main class="flex-1 px-6 py-6 pb-24">
        <!-- Profile Info -->
        <div class="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <div class="text-center mb-6">
            <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-3xl">👤</span>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-1">
              {{ currentUser?.first_name }} {{ currentUser?.last_name }}
            </h2>
            <p class="text-gray-500">{{ currentUser?.username }}</p>
            <p class="text-gray-500 text-sm">{{ currentUser?.email }}</p>
          </div>
          
          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-blue-600">12</div>
              <div class="text-xs text-gray-500">Grupos</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-600">28</div>
              <div class="text-xs text-gray-500">Actividades</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-yellow-600">5</div>
              <div class="text-xs text-gray-500">Logros</div>
            </div>
          </div>
        </div>

        <!-- Menu Options -->
        <div class="space-y-4">
          <!-- Configuración -->
          <div class="profile-menu-item" (click)="navigateTo('/settings')">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span class="text-xl">⚙️</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Configuración</h3>
                <p class="text-sm text-gray-500">Personaliza tu experiencia</p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </div>

          <!-- Notificaciones -->
          <div class="profile-menu-item" (click)="navigateTo('/notifications')">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-xl">🔔</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Notificaciones</h3>
                <p class="text-sm text-gray-500">Gestiona tus notificaciones</p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </div>

          <!-- Privacidad -->
          <div class="profile-menu-item" (click)="navigateTo('/privacy')">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span class="text-xl">🔒</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Privacidad</h3>
                <p class="text-sm text-gray-500">Controla tu privacidad</p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </div>

          <!-- Ayuda -->
          <div class="profile-menu-item" (click)="navigateTo('/help')">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span class="text-xl">❓</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">Ayuda y Soporte</h3>
                <p class="text-sm text-gray-500">Obtén ayuda cuando la necesites</p>
              </div>
              <span class="text-gray-400">→</span>
            </div>
          </div>

          <!-- Cerrar Sesión -->
          <div class="profile-menu-item border-red-200" (click)="logout()">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span class="text-xl">🚪</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-red-600">Cerrar Sesión</h3>
                <p class="text-sm text-gray-500">Salir de tu cuenta</p>
              </div>
              <span class="text-red-400">→</span>
            </div>
          </div>
        </div>

        <!-- App Info -->
        <div class="text-center mt-8 pt-8 border-t border-gray-200">
          <p class="text-gray-400 text-sm">ActivAmigos v1.0.0</p>
          <p class="text-gray-400 text-xs mt-1">Conectando comunidades activas</p>
        </div>
      </main>

      <!-- Bottom Navigation -->
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [`
    .profile-menu-item {
      background-color: white;
      border-radius: 16px;
      padding: 16px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease-in-out;
      cursor: pointer;
    }

    .profile-menu-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .profile-menu-item:active {
      transform: translateY(0);
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  navigateTo(path: string) {
    if (path === '/settings' || path === '/notifications' || path === '/privacy') {
      alert('Funcionalidad próximamente');
    } else {
      this.router.navigate([path]);
    }
  }

  editProfile() {
    alert('Editar Perfil - Funcionalidad próximamente');
  }

  logout() {
    const confirmLogout = confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (confirmLogout) {
      this.authService.logout()
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.router.navigate(['/auth/login']));
    }
  }
}