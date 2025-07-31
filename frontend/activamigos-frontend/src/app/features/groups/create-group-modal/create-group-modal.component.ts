
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GroupCreate } from '../../../core/models/group.model';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-group-modal.component.html',
  styleUrls: ['./create-group-modal.component.scss']
})
export class CreateGroupModalComponent {
  @Input() isVisible = false;
  @Input() isLoading = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() createGroup = new EventEmitter<GroupCreate>();

  createGroupForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      rules: ['']
    });
  }

  onSubmit() {
    if (this.createGroupForm.valid && !this.isLoading) {
      const formData = this.createGroupForm.value;

      // Trim whitespace and handle empty strings
      const groupData: GroupCreate = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        rules: formData.rules?.trim() || undefined
      };

      this.createGroup.emit(groupData);
    }
  }

  onClose() {
    if (!this.isLoading) {
      this.closeModal.emit();
      this.resetForm();
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  resetForm() {
    this.createGroupForm.reset();
    this.createGroupForm.markAsUntouched();
  }

  // Getter methods for easy access to form controls
  get name() { return this.createGroupForm.get('name'); }
  get description() { return this.createGroupForm.get('description'); }
  get rules() { return this.createGroupForm.get('rules'); }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.createGroupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.createGroupForm.get(fieldName);

    if (field?.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['minlength']) {
        return 'El nombre debe tener al menos 1 carácter';
      }
      if (field.errors['maxlength']) {
        const maxLength = field.errors['maxlength'].requiredLength;
        return `Máximo ${maxLength} caracteres permitidos`;
      }
    }

    return '';
  }

  getCharacterCount(fieldName: string): number {
    const field = this.createGroupForm.get(fieldName);
    return field?.value?.length || 0;
  }
}