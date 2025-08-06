import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AccessibilitySetting {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-accessibility',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <h1 class="text-xl font-bold text-gray-900">Configuración de Accesibilidad</h1>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 px-6 py-6">
        <!-- Introduction -->
        <div class="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span class="text-2xl">♿</span>
            </div>
            <div>
              <h2 class="text-lg font-bold text-gray-900">Accesibilidad</h2>
              <p class="text-sm text-gray-500">Personaliza la experiencia según tus necesidades</p>
            </div>
          </div>
          <p class="text-gray-600 text-sm">
            Estas configuraciones te ayudan a personalizar ActivAmigos para una mejor experiencia de usuario.
            Cada opción está diseñada para mejorar la accesibilidad y usabilidad de la aplicación.
          </p>
        </div>

        <!-- Accessibility Settings -->
        <div class="space-y-4">
          <div 
            *ngFor="let setting of accessibilitySettings" 
            class="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span class="text-xl">{{ setting.icon }}</span>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ setting.title }}</h3>
                  <p class="text-sm text-gray-500 mt-1">{{ setting.description }}</p>
                </div>
              </div>
              <div class="ml-4">
                <!-- Toggle Switch -->
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    class="sr-only peer" 
                    [(ngModel)]="setting.enabled"
                    (change)="toggleSetting(setting)"
                  >
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Information Panel -->
        <div class="bg-blue-50 rounded-xl p-4 mt-6 border border-blue-200">
          <div class="flex items-start space-x-3">
            <span class="text-blue-600 text-xl">ℹ️</span>
            <div>
              <h3 class="font-semibold text-blue-900">Funcionalidad en Desarrollo</h3>
              <p class="text-blue-700 text-sm mt-1">
                Estas configuraciones están siendo implementadas y estarán disponibles en próximas actualizaciones.
                Por ahora puedes activarlas para indicar tus preferencias.
              </p>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="mt-8">
          <button
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            (click)="saveSettings()"
            [disabled]="isSaving"
          >
            {{ isSaving ? 'Guardando...' : 'Guardar Preferencias' }}
          </button>
        </div>

        <!-- Success Message -->
        <div 
          *ngIf="showSuccessMessage" 
          class="fixed bottom-4 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl shadow-lg z-50"
        >
          <div class="flex items-center">
            <span class="mr-2">✅</span>
            Configuración guardada exitosamente
          </div>
        </div>
      </main>
    </div>
  `,
  styleUrls: ['./accessibility.component.scss']
})
export class AccessibilityComponent implements OnInit {
  isSaving = false;
  showSuccessMessage = false;

  accessibilitySettings: AccessibilitySetting[] = [
    {
      id: 'high-contrast',
      title: 'Alto Contraste',
      description: 'Aumenta el contraste para mejorar la visibilidad del texto y elementos',
      icon: '🎨',
      enabled: false
    },
    {
      id: 'reduced-motion',
      title: 'Movimiento Reducido',
      description: 'Reduce las animaciones y transiciones para evitar mareos',
      icon: '🔄',
      enabled: false
    },
    {
      id: 'large-text',
      title: 'Texto Grande',
      description: 'Aumenta el tamaño del texto para mejorar la legibilidad',
      icon: '🔤',
      enabled: false
    },
    {
      id: 'keyboard-navigation',
      title: 'Navegación por Teclado',
      description: 'Mejora la navegación usando solo el teclado',
      icon: '⌨️',
      enabled: false
    },
    {
      id: 'screen-reader',
      title: 'Lector de Pantalla',
      description: 'Optimiza la experiencia para lectores de pantalla',
      icon: '🔊',
      enabled: false
    }
  ];

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/profile']);
  }

  toggleSetting(setting: AccessibilitySetting) {
    // In a real implementation, this would trigger immediate UI changes
    console.log(`Toggle ${setting.id}: ${setting.enabled}`);
    
    // Example of how these settings might be applied
    if (setting.id === 'high-contrast') {
      this.applyHighContrast(setting.enabled);
    } else if (setting.id === 'reduced-motion') {
      this.applyReducedMotion(setting.enabled);
    } else if (setting.id === 'large-text') {
      this.applyLargeText(setting.enabled);
    }
  }

  private applyHighContrast(enabled: boolean) {
    // Placeholder for high contrast implementation
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  private applyReducedMotion(enabled: boolean) {
    // Placeholder for reduced motion implementation
    if (enabled) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  private applyLargeText(enabled: boolean) {
    // Placeholder for large text implementation
    if (enabled) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
  }

  saveSettings() {
    this.isSaving = true;

    // Simulate API call to save settings
    setTimeout(() => {
      this.isSaving = false;
      this.showSuccessMessage = true;
      
      // Store settings in localStorage as a placeholder
      localStorage.setItem('accessibility-settings', JSON.stringify(this.accessibilitySettings));
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        this.showSuccessMessage = false;
      }, 3000);
    }, 1500);
  }

  ngOnInit() {
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.accessibilitySettings = parsed;
        
        // Apply saved settings
        this.accessibilitySettings.forEach(setting => {
          if (setting.enabled) {
            this.toggleSetting(setting);
          }
        });
      } catch (error) {
        console.warn('Could not load accessibility settings:', error);
      }
    }
  }
}