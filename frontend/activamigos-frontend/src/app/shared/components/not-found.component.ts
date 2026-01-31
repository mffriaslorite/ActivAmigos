import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <div class="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100 transform hover:scale-105 transition-transform duration-300">
        <div class="text-8xl mb-4 animate-bounce">🙈</div>
        
        <h1 class="text-4xl font-black text-gray-900 mb-2 tracking-tight">404</h1>
        <h2 class="text-xl font-bold text-gray-700 mb-4">¡Vaya! Te has perdido</h2>
        
        <p class="text-gray-500 mb-8 leading-relaxed">
          La página que buscas no existe o ha sido movida. Mejor volvamos a terreno conocido.
        </p>

        <a routerLink="/dashboard" 
           class="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
          🏠 Volver al Inicio
        </a>
      </div>
      
      <p class="mt-8 text-sm text-gray-400 font-medium">
        ActivAmigos © 2026
      </p>
    </div>
  `,
  styles: []
})
export class NotFoundComponent {
  
  goBack() {
    // Use browser's back functionality
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard if no history
      window.location.href = '/dashboard';
    }
  }
}