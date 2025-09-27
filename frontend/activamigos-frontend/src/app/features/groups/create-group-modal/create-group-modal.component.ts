
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GroupCreate } from '../../../core/models/group.model';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RulesSelectorComponent],
  templateUrl: './create-group-modal.component.html',
  styleUrls: ['./create-group-modal.component.scss']
})
export class CreateGroupModalComponent {
  @Input() isVisible = false;
  @Input() isLoading = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() createGroup = new EventEmitter<GroupCreate>();

  createGroupForm: FormGroup;
  selectedRuleIds: number[] = [];
  showRulesStep = false;

  constructor(private fb: FormBuilder) {
    this.createGroupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      rules: ['']
    });
  }

  onSubmit() {
    if (this.createGroupForm.valid && !this.isLoading) {
      if (!this.showRulesStep) {
        // Go to rules step
        this.showRulesStep = true;
        return;
      }

      // Create group with selected rules
      const formData = this.createGroupForm.value;
      const groupData: GroupCreate = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        rules: formData.rules?.trim() || undefined,
        rule_ids: this.selectedRuleIds
      };

      this.createGroup.emit(groupData);
    }
  }

  goBackToBasicInfo() {
    this.showRulesStep = false;
  }

  onRulesSelected(ruleIds: number[]) {
    this.selectedRuleIds = ruleIds;
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
    this.showRulesStep = false;
    this.selectedRuleIds = [];
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