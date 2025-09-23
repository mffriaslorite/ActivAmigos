import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../../core/services/attendance.service';

export interface ActivityToConfirm {
  id: number;
  title: string;
  description?: string;
  date: string;
  location?: string;
}

@Component({
  selector: 'app-attendance-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      (click)="onBackdropClick($event)"
    >
      <div 
        class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">
            📅 Confirmar Asistencia
          </h3>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            (click)="close()"
            aria-label="Cerrar modal"
          >
            <span class="text-2xl">×</span>
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <!-- Activity Info -->
          <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 class="font-semibold text-blue-900 mb-2">{{ activity?.title }}</h4>
            <div class="space-y-2 text-sm text-blue-800">
              <div class="flex items-center space-x-2">
                <span>📅</span>
                <span>{{ formatActivityDate(activity?.date) }}</span>
              </div>
              <div *ngIf="activity?.location" class="flex items-center space-x-2">
                <span>📍</span>
                <span>{{ activity.location }}</span>
              </div>
            </div>
            <p *ngIf="activity?.description" class="text-sm text-blue-700 mt-3">
              {{ activity.description }}
            </p>
          </div>

          <!-- Confirmation Question -->
          <div class="mb-6 text-center">
            <div class="text-4xl mb-4">🤔</div>
            <h4 class="text-lg font-semibold text-gray-900 mb-2">
              ¿Vas a asistir a esta actividad?
            </h4>
            <p class="text-sm text-gray-600">
              Confirmar tu asistencia nos ayuda a planificar mejor la actividad.
            </p>
          </div>

          <!-- Warning about not confirming -->
          <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-start space-x-3">
              <span class="text-yellow-600 text-lg">⚠️</span>
              <div class="text-sm">
                <p class="text-yellow-800 font-medium mb-1">Importante:</p>
                <p class="text-yellow-700">
                  Si no confirmas tu asistencia antes del plazo límite, perderás 50 puntos automáticamente.
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button
              type="button"
              class="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              (click)="confirmAttendance()"
              [disabled]="isSubmitting"
            >
              <span *ngIf="!isSubmitting" class="flex items-center justify-center space-x-2">
                <span>✅</span>
                <span>Sí, voy a asistir</span>
              </span>
              <span *ngIf="isSubmitting" class="flex items-center justify-center">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Confirmando...
              </span>
            </button>
            
            <button
              type="button"
              class="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              (click)="postponeDecision()"
              [disabled]="isSubmitting"
            >
              Decidir más tarde
            </button>
          </div>

          <!-- Additional Info -->
          <div class="mt-6 text-center">
            <p class="text-xs text-gray-500">
              Puedes cambiar tu confirmación más tarde si es necesario.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .bg-white {
        border: 2px solid #000;
      }
      
      .border-gray-300 {
        border-color: #374151 !important;
      }
      
      .bg-green-600 {
        background-color: #059669 !important;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .animate-spin {
        animation: none;
      }
    }
    
    /* Large text support */
    @media (min-width: 1024px) {
      .text-sm {
        font-size: 0.95rem;
      }
      
      .text-xs {
        font-size: 0.8rem;
      }
    }
  `]
})
export class AttendanceModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() activity: ActivityToConfirm | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<any>();

  isSubmitting = false;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit() {}

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
    this.isSubmitting = false;
  }

  postponeDecision() {
    this.closeModal();
  }

  confirmAttendance() {
    if (!this.activity || this.isSubmitting) return;

    this.isSubmitting = true;

    this.attendanceService.confirmAttendance(this.activity.id).subscribe({
      next: (response) => {
        console.log('Attendance confirmed:', response);
        this.confirmed.emit(response);
        this.closeModal();
        
        // Show success message
        // You might want to use a toast service here
        alert('¡Asistencia confirmada! Gracias por confirmar tu participación.');
      },
      error: (error) => {
        console.error('Error confirming attendance:', error);
        alert('Error al confirmar asistencia: ' + error.message);
        this.isSubmitting = false;
      }
    });
  }

  formatActivityDate(dateString?: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}