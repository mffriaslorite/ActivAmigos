import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styles: []
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() title = '¿Estás seguro?';
  @Input() message = '';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() type: 'danger' | 'warning' | 'info' = 'warning'; // 'info' para avisos sin acción negativa
  @Input() isLoading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdropClick(event: Event) {
    if (this.isLoading) return;
    if (event.target === event.currentTarget) {
      this.cancel.emit();
    }
  }
}