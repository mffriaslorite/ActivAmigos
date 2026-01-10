import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GroupsService } from '../../../core/services/groups.service';
import { GroupCreate } from '../../../core/models/group.model';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';

@Component({
  selector: 'app-create-group-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RulesSelectorComponent],
  templateUrl: './create-group-modal.component.html',
  styleUrls: ['./create-group-modal.component.scss']
})
export class CreateGroupModalComponent {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() groupCreated = new EventEmitter<void>();

  groupForm: FormGroup;
  isSubmitting = false;
  
  // Gestión de Pasos
  currentStep: 1 | 2 = 1;
  selectedRuleIds: number[] = [];
  
  // Feedback
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private groupsService: GroupsService
  ) {
    this.groupForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]]
    });
  }

  // --- Navegación ---

  nextStep() {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }
    this.currentStep = 2;
    this.errorMessage = '';
  }

  prevStep() {
    this.currentStep = 1;
    this.errorMessage = '';
  }

  // --- Gestión de Reglas (Paso 2) ---

  onRulesSave(ruleIds: number[]) {
    this.selectedRuleIds = ruleIds;
    // Al guardar reglas, lanzamos la creación final
    this.finalSubmit();
  }

  onRulesCancel() {
    this.prevStep();
  }

  // --- Envío Final ---

  finalSubmit() {
    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.groupForm.value;
    
    const groupData: GroupCreate = {
      name: formValue.name.trim(),
      description: formValue.description?.trim(),
      rule_ids: this.selectedRuleIds
    };

    this.groupsService.createGroup(groupData).subscribe({
      next: () => {
        this.successMessage = '¡Grupo creado con éxito!';
        
        // Cerrar tras breve delay
        setTimeout(() => {
          this.groupCreated.emit();
          this.closeModal();
        }, 1500);
      },
      error: (error) => {
        console.error('Error creating group:', error);
        this.errorMessage = 'No se pudo crear el grupo. Inténtalo de nuevo.';
        this.isSubmitting = false;
      }
    });
  }

  // --- Utilidades ---

  closeModal() {
    this.close.emit();
    setTimeout(() => {
      this.resetForm();
    }, 300);
  }

  private resetForm() {
    this.groupForm.reset();
    this.currentStep = 1;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedRuleIds = [];
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.groupForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  onBackdropClick(event: Event) {
    if (this.isSubmitting) return;
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}