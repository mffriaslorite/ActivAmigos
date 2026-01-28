import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-profile-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmationModalComponent], // ✅ Añadido a imports
  templateUrl: './edit-profile-modal.component.html',
  styleUrls: ['./edit-profile-modal.component.scss']
})
export class ProfileEditModalComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() currentUser: User | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<User>();

  profileForm: FormGroup;
  isLoading = false;     // Para guardar cambios generales
  isUploading = false;   // Para subir foto
  
  // ✅ Nuevas variables para el modal de borrado
  showDeleteConfirmation = false;
  isDeleting = false;    // Para spinner del modal de borrado

  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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
    this.fileInputRef?.nativeElement.click();
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor selecciona un archivo de imagen válido';
        return;
      }
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

  getProfileImageUrl(): string | null {
    return this.authService.getProfileImageSrc ? this.authService.getProfileImageSrc() : null;
  }

  // ✅ Modificado: Solo abre el modal
  onDeleteImage() {
    this.showDeleteConfirmation = true;
  }

  // ✅ Nuevo: Ejecuta el borrado cuando el usuario confirma en el modal
  onConfirmDelete() {
    this.isDeleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.deleteProfileImage()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.currentUser = updatedUser;
          this.profileUpdated.emit(updatedUser);
          this.successMessage = 'Foto de perfil eliminada';
          
          this.isDeleting = false;
          this.showDeleteConfirmation = false; // Cierra el modal de confirmación
          
          if (this.fileInputRef) {
            this.fileInputRef.nativeElement.value = '';
          }
        },
        error: (error) => {
          this.errorMessage = error.message || 'No se pudo eliminar la foto';
          this.isDeleting = false;
          this.showDeleteConfirmation = false;
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