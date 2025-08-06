import { Component, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" *ngIf="isVisible">
      <div class="bg-white rounded-xl p-6 m-4 w-full max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Cambiar Contraseña</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2"
            (click)="closeModal()"
          >
            ✕
          </button>
        </div>

        <!-- Password Change Form -->
        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
          <!-- Current Password -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Actual
            </label>
            <div class="relative">
              <input
                [type]="showCurrentPassword ? 'text' : 'password'"
                formControlName="current_password"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu contraseña actual"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center"
                (click)="showCurrentPassword = !showCurrentPassword"
              >
                {{ showCurrentPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <div *ngIf="passwordForm.get('current_password')?.invalid && passwordForm.get('current_password')?.touched" 
                 class="text-red-500 text-xs mt-1">
              La contraseña actual es requerida
            </div>
          </div>

          <!-- New Password -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña
            </label>
            <div class="relative">
              <input
                [type]="showNewPassword ? 'text' : 'password'"
                formControlName="new_password"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nueva contraseña"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center"
                (click)="showNewPassword = !showNewPassword"
              >
                {{ showNewPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <div *ngIf="passwordForm.get('new_password')?.invalid && passwordForm.get('new_password')?.touched" 
                 class="text-red-500 text-xs mt-1">
              La nueva contraseña debe tener al menos 8 caracteres
            </div>
          </div>

          <!-- Confirm New Password -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <div class="relative">
              <input
                [type]="showConfirmPassword ? 'text' : 'password'"
                formControlName="confirm_password"
                class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirma tu nueva contraseña"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center"
                (click)="showConfirmPassword = !showConfirmPassword"
              >
                {{ showConfirmPassword ? '🙈' : '👁️' }}
              </button>
            </div>
            <div *ngIf="passwordForm.get('confirm_password')?.invalid && passwordForm.get('confirm_password')?.touched" 
                 class="text-red-500 text-xs mt-1">
              Las contraseñas no coinciden
            </div>
          </div>

          <!-- Password Requirements -->
          <div class="mb-4 p-3 bg-blue-50 rounded-md">
            <h4 class="text-sm font-medium text-blue-900 mb-2">Requisitos de la contraseña:</h4>
            <ul class="text-xs text-blue-700 space-y-1">
              <li class="flex items-center">
                <span class="mr-2">{{ getPasswordStrength().length ? '✅' : '❌' }}</span>
                Al menos 8 caracteres
              </li>
              <li class="flex items-center">
                <span class="mr-2">{{ getPasswordStrength().hasUpperCase ? '✅' : '❌' }}</span>
                Una letra mayúscula
              </li>
              <li class="flex items-center">
                <span class="mr-2">{{ getPasswordStrength().hasLowerCase ? '✅' : '❌' }}</span>
                Una letra minúscula
              </li>
              <li class="flex items-center">
                <span class="mr-2">{{ getPasswordStrength().hasNumber ? '✅' : '❌' }}</span>
                Un número
              </li>
            </ul>
          </div>

          <!-- Error/Success Messages -->
          <div *ngIf="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {{ errorMessage }}
          </div>
          <div *ngIf="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {{ successMessage }}
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-3">
            <button
              type="button"
              class="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              (click)="closeModal()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              [disabled]="isLoading || passwordForm.invalid"
            >
              {{ isLoading ? 'Cambiando...' : 'Cambiar Contraseña' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./password-change-modal.component.scss']
})
export class PasswordChangeModalComponent implements OnDestroy {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() passwordChanged = new EventEmitter<void>();

  passwordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirm_password: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordValidator(control: AbstractControl) {
    const password = control.value;
    if (!password) return null;

    const hasNumber = /[0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const valid = hasNumber && hasUpper && hasLower && password.length >= 8;

    return valid ? null : { passwordStrength: true };
  }

  passwordMatchValidator(group: AbstractControl) {
    const newPassword = group.get('new_password');
    const confirmPassword = group.get('confirm_password');
    
    if (!newPassword || !confirmPassword) return null;
    
    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  getPasswordStrength() {
    const password = this.passwordForm.get('new_password')?.value || '';
    return {
      length: password.length >= 8,
      hasNumber: /[0-9]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password)
    };
  }

  onSubmit() {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { current_password, new_password } = this.passwordForm.value;
      
      this.authService.changePassword({ current_password, new_password })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.successMessage = response.message || 'Contraseña cambiada exitosamente';
            this.isLoading = false;
            this.passwordChanged.emit();
            setTimeout(() => {
              this.closeModal();
            }, 2000);
          },
          error: (error) => {
            this.errorMessage = error.message || 'Error al cambiar la contraseña';
            this.isLoading = false;
          }
        });
    }
  }

  closeModal() {
    this.close.emit();
    this.passwordForm.reset();
    this.errorMessage = '';
    this.successMessage = '';
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }
}