import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModerationService } from '../../../core/services/moderation.service';

export interface UserToWarn {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  warning_count: number;
}

@Component({
  selector: 'app-moderation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moderation-modal.component.html',
  styleUrls: ['./moderation-modal.component.scss']
})
export class ModerationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() user: UserToWarn | null = null;
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId: number = 0;

  @Output() close = new EventEmitter<void>();
  @Output() warningIssued = new EventEmitter<any>();

  warningReason = '';
  isSubmitting = false;
  
  // Estados de feedback interno
  showSuccess = false;
  errorMessage = '';

  // Motivos predefinidos con iconos para hacerlo más visual
  reasons = [
    { id: 'language', label: 'Lenguaje inapropiado', icon: '🤬' },
    { id: 'spam', label: 'Spam / Repetitivo', icon: '📢' },
    { id: 'respect', label: 'Falta de respeto', icon: '😠' },
    { id: 'rules', label: 'Incumplimiento de normas', icon: '📜' },
    { id: 'other', label: 'Otro motivo', icon: '🤔' }
  ];

  constructor(private moderationService: ModerationService) {}

  ngOnInit() {}

  onBackdropClick(event: Event) {
    if (this.isSubmitting || this.showSuccess) return;
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
    // Resetear estados al cerrar
    setTimeout(() => {
      this.warningReason = '';
      this.showSuccess = false;
      this.errorMessage = '';
      this.isSubmitting = false;
    }, 300);
  }

  selectReason(reason: string) {
    this.warningReason = reason;
    this.errorMessage = ''; // Limpiar error si selecciona
  }

  issueWarning() {
    if (!this.user || !this.warningReason) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    this.moderationService.issueWarning({
      target_user_id: this.user.id,
      context_type: this.contextType,
      context_id: this.contextId,
      reason: this.warningReason
    }).subscribe({
      next: (response) => {
        // 1. Mostrar estado de éxito
        this.showSuccess = true;
        
        // 2. Notificar y cerrar automáticamente tras leer
        setTimeout(() => {
          this.warningIssued.emit(response);
          this.onClose();
        }, 1500);
      },
      error: (error) => {
        console.error('Error issuing warning:', error);
        this.isSubmitting = false;
        this.errorMessage = 'No se pudo enviar la advertencia. Inténtalo de nuevo.';
      }
    });
  }

  getUserName(): string {
    if (!this.user) return 'Usuario';
    return this.user.first_name || this.user.username;
  }
}