import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BottomNavComponent } from '../../shared/components/bottom-nav.component';

@Component({
  selector: 'app-groups',
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
          <h1 class="text-xl font-bold text-gray-900">Grupos</h1>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 px-6 py-6 pb-24">
        <!-- Search Bar -->
        <div class="mb-6">
          <div class="relative">
            <input 
              type="text" 
              placeholder="Buscar grupos..."
              class="w-full px-4 py-3 pl-12 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        <!-- Categories -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Categorías</h2>
          <div class="flex space-x-3 overflow-x-auto pb-2">
            <button class="category-chip bg-blue-500 text-white">Deportes</button>
            <button class="category-chip bg-gray-200 text-gray-700">Arte</button>
            <button class="category-chip bg-gray-200 text-gray-700">Música</button>
            <button class="category-chip bg-gray-200 text-gray-700">Cocina</button>
            <button class="category-chip bg-gray-200 text-gray-700">Juegos</button>
          </div>
        </div>

        <!-- Groups List -->
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Grupos Recomendados</h2>
          <div class="space-y-4">
            <!-- Group Card -->
            <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span class="text-2xl">⚽</span>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Fútbol Los Viernes</h3>
                  <p class="text-sm text-gray-500 mb-2">Grupo para jugar fútbol todos los viernes en el parque</p>
                  <div class="flex items-center space-x-4 text-xs text-gray-500">
                    <span>👥 12 miembros</span>
                    <span>📍 Parque Central</span>
                  </div>
                </div>
                <button class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                  Unirse
                </button>
              </div>
            </div>

            <!-- Another Group Card -->
            <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <span class="text-2xl">🎨</span>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">Taller de Arte</h3>
                  <p class="text-sm text-gray-500 mb-2">Aprende y practica diferentes técnicas artísticas</p>
                  <div class="flex items-center space-x-4 text-xs text-gray-500">
                    <span>👥 8 miembros</span>
                    <span>📍 Centro Cultural</span>
                  </div>
                </div>
                <button class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                  Unirse
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State Message -->
        <div class="text-center py-8">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Funcionalidad en desarrollo</h3>
          <p class="text-gray-500">Los grupos estarán disponibles en próximas versiones</p>
        </div>
      </main>

      <!-- Floating Action Button -->
      <button 
        class="fixed bottom-20 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl z-10"
        (click)="createGroup()"
        [attr.aria-label]="'Crear nuevo grupo'"
      >
        +
      </button>

      <!-- Bottom Navigation -->
      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [`
    .category-chip {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      transition: all 0.2s ease-in-out;
    }

    .category-chip:hover {
      transform: translateY(-1px);
    }
  `]
})
export class GroupsComponent {
  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  createGroup() {
    alert('Crear Nuevo Grupo - Funcionalidad próximamente');
  }
}