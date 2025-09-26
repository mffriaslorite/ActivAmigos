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