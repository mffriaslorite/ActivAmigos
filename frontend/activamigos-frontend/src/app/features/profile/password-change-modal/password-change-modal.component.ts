import { Component, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { PasswordHint } from '../../../core/models/auth.model';

@Component({
  selector: 'app-password-change-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './password-change-modal.component.html',
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
  passwordHint: PasswordHint | null = null;
  animalsList: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      // ✅ CAMBIO: Eliminada la validación compleja. Solo mínimo 2 caracteres.
      new_password: ['', [Validators.required, Validators.minLength(2)]],
      confirm_password: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.authService.getAnimalsList().subscribe({
      next: (response) => {
        this.animalsList = response.animals;
        this.passwordHint = {
          hint_available: true,
          hint_type: 'ANIMAL_LIST',
          animals: response.animals
        };
      },
      error: (err) => console.error('Error loading animals list:', err)
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ ELIMINADO: passwordValidator (ya no se usa)

  passwordMatchValidator(group: AbstractControl) {
    const newPassword = group.get('new_password');
    const confirmPassword = group.get('confirm_password');
    
    if (!newPassword || !confirmPassword) return null;
    
    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
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