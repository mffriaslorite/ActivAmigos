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
  templateUrl: './attendance-modal.component.html',
  styleUrls: ['./attendance-modal.component.scss']
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

  confirmAttendance(willAttend: boolean = true) {
    if (!this.activity || this.isSubmitting) return;

    this.isSubmitting = true;

    // Update the service call to include will_attend parameter
    const requestBody = {
      activity_id: this.activity.id,
      will_attend: willAttend
    };

    this.attendanceService.confirmAttendance(this.activity.id, willAttend).subscribe({
      next: (response) => {
        console.log('Attendance response:', response);
        this.confirmed.emit(response);
        this.closeModal();
        
        // Show appropriate success message
        const message = willAttend 
          ? '¡Asistencia confirmada! Gracias por confirmar tu participación.'
          : '¡Gracias por avisar! Has indicado que no podrás asistir.';
        alert(message);
      },
      error: (error) => {
        console.error('Error confirming attendance:', error);
        alert('Error al procesar la respuesta: ' + error.message);
        this.isSubmitting = false;
      }
    });
  }

  confirmWillAttend() {
    this.confirmAttendance(true);
  }

  confirmWillNotAttend() {
    this.confirmAttendance(false);
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