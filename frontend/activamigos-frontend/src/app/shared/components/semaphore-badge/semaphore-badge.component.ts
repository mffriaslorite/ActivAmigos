import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-semaphore-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-2">
      <!-- Semaphore Light -->
      <div 
        class="w-4 h-4 rounded-full border-2 border-gray-300"
        [class.bg-gray-400]="color === 'grey'"
        [class.border-gray-400]="color === 'grey'"
        [class.bg-green-300]="color === 'light_green'"
        [class.border-green-400]="color === 'light_green'"
        [class.bg-green-600]="color === 'dark_green'"
        [class.border-green-700]="color === 'dark_green'"
        [class.bg-yellow-500]="color === 'yellow'"
        [class.border-yellow-600]="color === 'yellow'"
        [class.bg-red-500]="color === 'red'"
        [class.border-red-600]="color === 'red'"
        [title]="getTooltip()"
        [attr.aria-label]="getTooltip()"
      ></div>
      
      <!-- Warning Count -->
      <span 
        *ngIf="warningCount > 0" 
        class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium"
        [title]="warningCount + ' advertencia' + (warningCount > 1 ? 's' : '')"
      >
        {{ warningCount }}
      </span>
      
      <!-- Status Text (optional) -->
      <span 
        *ngIf="showText" 
        class="text-sm font-medium"
        [class.text-gray-600]="color === 'grey'"
        [class.text-green-600]="color === 'light_green' || color === 'dark_green'"
        [class.text-yellow-600]="color === 'yellow'"
        [class.text-red-600]="color === 'red'"
      >
        {{ getStatusText() }}
      </span>
    </div>
  `,
  styles: [`
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .w-4.h-4 {
        border-width: 3px;
      }
      
      .bg-gray-400 {
        background-color: #6b7280 !important;
        border-color: #374151 !important;
      }
      
      .bg-green-300 {
        background-color: #10b981 !important;
        border-color: #047857 !important;
      }
      
      .bg-green-600 {
        background-color: #059669 !important;
        border-color: #047857 !important;
      }
      
      .bg-yellow-500 {
        background-color: #f59e0b !important;
        border-color: #d97706 !important;
      }
      
      .bg-red-500 {
        background-color: #dc2626 !important;
        border-color: #991b1b !important;
      }
    }
    
    /* Large text support */
    @media (min-width: 1024px) {
      .text-xs {
        font-size: 0.8rem;
      }
      
      .text-sm {
        font-size: 0.95rem;
      }
    }
  `]
})
export class SemaphoreBadgeComponent {
  @Input() color: 'grey' | 'light_green' | 'dark_green' | 'yellow' | 'red' = 'grey';
  @Input() warningCount: number = 0;
  @Input() showText: boolean = false;

  getTooltip(): string {
    switch (this.color) {
      case 'grey':
        return 'No participando en el chat';
      case 'light_green':
        return 'Miembro pero nunca ha chateado';
      case 'dark_green':
        return 'Miembro activo en el chat';
      case 'yellow':
        return `Usuario con ${this.warningCount} advertencia${this.warningCount > 1 ? 's' : ''}`;
      case 'red':
        return 'Usuario suspendido del chat';
      default:
        return 'Estado desconocido';
    }
  }

  getStatusText(): string {
    switch (this.color) {
      case 'grey':
        return 'Sin participar';
      case 'light_green':
        return 'Nuevo miembro';
      case 'dark_green':
        return 'Activo';
      case 'yellow':
        return 'Advertido';
      case 'red':
        return 'Suspendido';
      default:
        return '';
    }
  }
}