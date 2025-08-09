import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-profile-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-profile-modal.component.html',
  styleUrls: ['./edit-profile-modal.component.scss']
})
export class ProfileEditModalComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() currentUser: User | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<User>();

  profileForm: FormGroup;
  isLoading = false;
  isUploading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      bio: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit() {
    if (this.currentUser) {
      this.profileForm.patchValue({
        first_name: this.currentUser.first_name || '',
        last_name: this.currentUser.last_name || '',
        bio: this.currentUser.bio || ''
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor selecciona un archivo de imagen válido';
        return;
      }

      // Validate file size (16MB)
      if (file.size > 16 * 1024 * 1024) {
        this.errorMessage = 'El archivo es demasiado grande. El tamaño máximo es 16MB';
        return;
      }

      this.uploadImage(file);
    }
  }

  uploadImage(file: File) {
    this.isUploading = true;
    this.errorMessage = '';

    this.authService.uploadProfileImage(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.currentUser = updatedUser;
          this.profileUpdated.emit(updatedUser);
          this.successMessage = 'Imagen de perfil actualizada exitosamente';
          this.isUploading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al subir la imagen';
          this.isUploading = false;
        }
      });
  }

  onSubmit() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.profileForm.value;
      
      this.authService.updateProfile(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedUser) => {
            this.profileUpdated.emit(updatedUser);
            this.successMessage = 'Perfil actualizado exitosamente';
            this.isLoading = false;
            setTimeout(() => {
              this.closeModal();
            }, 2000);
          },
          error: (error) => {
            this.errorMessage = error.message || 'Error al actualizar el perfil';
            this.isLoading = false;
          }
        });
    }
  }

  closeModal() {
    this.close.emit();
    this.errorMessage = '';
    this.successMessage = '';
  }
}