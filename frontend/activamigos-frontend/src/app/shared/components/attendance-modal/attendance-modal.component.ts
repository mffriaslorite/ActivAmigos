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
  @Output() confirmed = new EventEmitter<boolean>();

  isSubmitting = false;
  
  // Estado para feedback visual interno
  showSuccess = false;
  successMessage = '';
  successIcon = '';
  successColor = '';

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit() {}

  onBackdropClick(event: Event) {
    if (this.isSubmitting || this.showSuccess) return;
    
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    this.showSuccess = false;
    this.isSubmitting = false;
    this.close.emit();
  }

  postponeDecision() {
    this.closeModal();
  }

  confirmAttendance(willAttend: boolean) {
    if (!this.activity || this.isSubmitting) return;

    this.isSubmitting = true;

    this.attendanceService.confirmAttendance(this.activity.id, willAttend).subscribe({
      next: () => {
        this.showSuccess = true;
        
        if (willAttend) {
          this.successIcon = '🎉';
          this.successMessage = '¡Genial! Contamos contigo.';
          this.successColor = 'text-green-600';
        } else {
          this.successIcon = '👍';
          this.successMessage = 'Gracias por avisar. ¡A la próxima!';
          this.successColor = 'text-blue-600';
        }

        setTimeout(() => {
          this.confirmed.emit(willAttend);
          this.closeModal();
        }, 2000);
      },
      error: (error) => {
        console.error('Error confirming attendance:', error);
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
    
    const targetDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    const date = new Date(targetDate);
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}