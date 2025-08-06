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
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" *ngIf="isVisible">
      <div class="bg-white rounded-xl p-6 m-4 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Editar Perfil</h2>
          <button 
            class="text-gray-400 hover:text-gray-600 p-2"
            (click)="closeModal()"
          >
            ✕
          </button>
        </div>

        <!-- Profile Image Section -->
        <div class="text-center mb-6">
          <div class="relative inline-block">
            <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <img 
                *ngIf="currentUser?.profile_image" 
                [src]="currentUser.profile_image" 
                alt="Profile" 
                class="w-full h-full object-cover"
              >
              <span *ngIf="!currentUser?.profile_image" class="text-3xl">👤</span>
            </div>
            <button 
              type="button"
              class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
              (click)="triggerFileInput()"
              [disabled]="isUploading"
            >
              📷
            </button>
          </div>
          <input 
            #fileInput
            type="file" 
            class="hidden" 
            accept="image/*"
            (change)="onImageSelected($event)"
          >
          <p class="text-sm text-gray-500 mt-2">
            {{ isUploading ? 'Subiendo imagen...' : 'Haz clic en el ícono de cámara para cambiar la foto' }}
          </p>
        </div>

        <!-- Edit Form -->
        <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
          <!-- First Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              formControlName="first_name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
            >
            <div *ngIf="profileForm.get('first_name')?.invalid && profileForm.get('first_name')?.touched" 
                 class="text-red-500 text-xs mt-1">
              El nombre es requerido y debe tener al menos 2 caracteres
            </div>
          </div>

          <!-- Last Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              formControlName="last_name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu apellido"
            >
            <div *ngIf="profileForm.get('last_name')?.invalid && profileForm.get('last_name')?.touched" 
                 class="text-red-500 text-xs mt-1">
              El apellido es requerido y debe tener al menos 2 caracteres
            </div>
          </div>

          <!-- Bio -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Biografía
            </label>
            <textarea
              formControlName="bio"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cuéntanos algo sobre ti..."
              maxlength="500"
            ></textarea>
            <div class="text-xs text-gray-500 mt-1">
              {{ profileForm.get('bio')?.value?.length || 0 }}/500 caracteres
            </div>
            <div *ngIf="profileForm.get('bio')?.invalid && profileForm.get('bio')?.touched" 
                 class="text-red-500 text-xs mt-1">
              La biografía no puede exceder 500 caracteres
            </div>
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
              [disabled]="isLoading || profileForm.invalid"
            >
              {{ isLoading ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./profile-edit-modal.component.scss']
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