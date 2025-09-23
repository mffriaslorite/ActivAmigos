import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';

export interface UserToWarn {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  warning_count?: number;
}

@Component({
  selector: 'app-moderation-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
            ⚠️ Advertir Usuario
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
          <!-- User Info -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Usuario a advertir:</h4>
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-lg">👤</span>
              </div>
              <div>
                <p class="font-semibold text-gray-900">
                  {{ getUserDisplayName() }}
                </p>
                <p class="text-sm text-gray-600">@{{ user?.username }}</p>
                <p *ngIf="user?.warning_count" class="text-xs text-yellow-600">
                  {{ user.warning_count }} advertencia{{ user.warning_count > 1 ? 's' : '' }} previa{{ user.warning_count > 1 ? 's' : '' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Warning Form -->
          <form [formGroup]="warningForm" (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label for="reason" class="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la advertencia *
              </label>
              <select
                id="reason"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                formControlName="reason"
              >
                <option value="">Selecciona un motivo</option>
                <option value="Lenguaje inapropiado">Lenguaje inapropiado</option>
                <option value="Comportamiento irrespetuoso">Comportamiento irrespetuoso</option>
                <option value="Spam o contenido irrelevante">Spam o contenido irrelevante</option>
                <option value="Compartir información privada">Compartir información privada</option>
                <option value="Acoso o intimidación">Acoso o intimidación</option>
                <option value="Contenido ofensivo">Contenido ofensivo</option>
                <option value="Otro">Otro motivo</option>
              </select>
              <div *ngIf="warningForm.get('reason')?.errors?.['required'] && warningForm.get('reason')?.touched" 
                   class="text-sm text-red-600 mt-1">
                Debe seleccionar un motivo
              </div>
            </div>

            <div *ngIf="warningForm.get('reason')?.value === 'Otro'" class="mb-4">
              <label for="customReason" class="block text-sm font-medium text-gray-700 mb-2">
                Especifica el motivo *
              </label>
              <textarea
                id="customReason"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Describe el motivo de la advertencia..."
                formControlName="customReason"
                maxlength="255"
              ></textarea>
              <div class="text-xs text-gray-500 mt-1">
                {{ warningForm.get('customReason')?.value?.length || 0 }}/255 caracteres
              </div>
            </div>

            <!-- Warning Info -->
            <div class="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-start space-x-3">
                <span class="text-yellow-600 text-lg">⚠️</span>
                <div class="text-sm">
                  <p class="text-yellow-800 font-medium mb-2">Consecuencias de esta advertencia:</p>
                  <ul class="text-yellow-700 space-y-1">
                    <li>• El usuario perderá 100 puntos</li>
                    <li *ngIf="user?.warning_count === 2">• <strong>El usuario será suspendido automáticamente</strong> (3ª advertencia)</li>
                    <li *ngIf="user?.warning_count < 2">• Si recibe {{ 3 - (user?.warning_count || 0) - 1 }} advertencia{{ (3 - (user?.warning_count || 0) - 1) > 1 ? 's' : '' }} más, será suspendido automáticamente</li>
                    <li>• Se enviará un mensaje del sistema al chat</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Auto-ban warning -->
            <div *ngIf="user?.warning_count === 2" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div class="flex items-start space-x-3">
                <span class="text-red-600 text-lg">🚫</span>
                <div class="text-sm">
                  <p class="text-red-800 font-bold mb-1">¡ATENCIÓN!</p>
                  <p class="text-red-700">Esta es la tercera advertencia. El usuario será <strong>suspendido automáticamente</strong> del chat.</p>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex space-x-3">
              <button
                type="button"
                class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                (click)="close()"
                [disabled]="isSubmitting"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                [disabled]="warningForm.invalid || isSubmitting"
              >
                <span *ngIf="!isSubmitting">Advertir Usuario</span>
                <span *ngIf="isSubmitting" class="flex items-center justify-center">
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Enviando...
                </span>
              </button>
            </div>
          </form>
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
      
      .bg-red-600 {
        background-color: #dc2626 !important;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .animate-spin {
        animation: none;
      }
    }
  `]
})
export class ModerationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() user: UserToWarn | null = null;
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId!: number;

  @Output() close = new EventEmitter<void>();
  @Output() warningIssued = new EventEmitter<any>();

  warningForm: FormGroup;
  isSubmitting = false;
  canIssueWarnings = false;

  constructor(
    private fb: FormBuilder,
    private chatService: ChatService,
    private authService: AuthService
  ) {
    this.warningForm = this.fb.group({
      reason: ['', Validators.required],
      customReason: ['']
    });

    // Add validator for custom reason when "Otro" is selected
    this.warningForm.get('reason')?.valueChanges.subscribe(value => {
      const customReasonControl = this.warningForm.get('customReason');
      if (value === 'Otro') {
        customReasonControl?.setValidators([Validators.required, Validators.maxLength(255)]);
      } else {
        customReasonControl?.clearValidators();
        customReasonControl?.setValue('');
      }
      customReasonControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    // Check if current user can issue warnings
    this.authService.currentUser$.subscribe(user => {
      this.canIssueWarnings = user?.role === 'ORGANIZER' || user?.role === 'SUPERADMIN';
    });
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  private resetForm() {
    this.warningForm.reset();
    this.isSubmitting = false;
  }

  getUserDisplayName(): string {
    if (!this.user) return '';
    
    if (this.user.first_name) {
      return this.user.first_name + (this.user.last_name ? ` ${this.user.last_name}` : '');
    }
    return this.user.username;
  }

  onSubmit() {
    if (this.warningForm.invalid || !this.user || this.isSubmitting) return;

    this.isSubmitting = true;

    const reason = this.warningForm.get('reason')?.value === 'Otro' 
      ? this.warningForm.get('customReason')?.value 
      : this.warningForm.get('reason')?.value;

    this.chatService.issueWarning(
      this.contextType,
      this.contextId,
      this.user.id,
      reason
    ).subscribe({
      next: (response) => {
        console.log('Warning issued successfully:', response);
        this.warningIssued.emit(response);
        this.closeModal();
        
        // Show success message
        // You might want to use a toast service here
        if (response.was_banned) {
          alert('Advertencia emitida. El usuario ha sido suspendido automáticamente.');
        } else {
          alert('Advertencia emitida correctamente.');
        }
      },
      error: (error) => {
        console.error('Error issuing warning:', error);
        alert('Error al emitir la advertencia: ' + error.message);
        this.isSubmitting = false;
      }
    });
  }
}