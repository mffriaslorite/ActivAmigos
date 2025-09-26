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
  templateUrl: './moderation-modal.component.html',
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