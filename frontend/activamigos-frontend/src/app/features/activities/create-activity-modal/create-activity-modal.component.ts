import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityCreate } from '../../../core/models/activity.model';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';

@Component({
  selector: 'app-create-activity-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RulesSelectorComponent],
  templateUrl: './create-activity-modal.component.html',
  styleUrls: ['./create-activity-modal.component.scss']
})
export class CreateActivityModalComponent implements OnInit {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() activityCreated = new EventEmitter<void>();

  activityForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  selectedRuleIds: number[] = [];
  showRulesStep = false;

  constructor(
    private fb: FormBuilder,
    private activitiesService: ActivitiesService
  ) {
    this.activityForm = this.createForm();
  }

  ngOnInit() {}

  private createForm(): FormGroup {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      location: ['', [Validators.maxLength(255)]],
      date: [tomorrow.toISOString().slice(0, 16), [Validators.required]],
      rules: ['']
    });
  }

  onSubmit() {
    if (this.activityForm.valid && !this.isSubmitting) {
      if (!this.showRulesStep) {
        // Go to rules step
        this.showRulesStep = true;
        return;
      }

      // Create activity with selected rules
      this.isSubmitting = true;
      this.errorMessage = '';

      const formValue = this.activityForm.value;
      const activityData: ActivityCreate = {
        title: formValue.title,
        description: formValue.description || undefined,
        location: formValue.location || undefined,
        date: new Date(formValue.date).toISOString(),
        rules: formValue.rules || undefined,
        rule_ids: this.selectedRuleIds
      };

      this.activitiesService.createActivity(activityData).subscribe({
        next: (activity) => {
          console.log('Activity created successfully:', activity);
          this.activityCreated.emit();
          this.resetForm();
          this.onClose();
        },
        error: (error) => {
          console.error('Error creating activity:', error);
          this.errorMessage = error.message || 'Error al crear la actividad';
          this.isSubmitting = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  goBackToBasicInfo() {
    this.showRulesStep = false;
  }

  onRulesSelected(ruleIds: number[]) {
    this.selectedRuleIds = ruleIds;
  }

  onClose() {
    this.resetForm();
    this.errorMessage = '';
    this.close.emit();
  }

  private resetForm() {
    this.activityForm.reset();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    this.activityForm.patchValue({
      date: tomorrow.toISOString().slice(0, 16)
    });
    this.isSubmitting = false;
    this.showRulesStep = false;
    this.selectedRuleIds = [];
  }

  private markFormGroupTouched() {
    Object.keys(this.activityForm.controls).forEach(key => {
      const control = this.activityForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.activityForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) {
        return 'Este campo es obligatorio';
      }
      if (field.errors['maxlength']) {
        return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.activityForm.get(fieldName);
    return !!(field?.touched && field?.errors);
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}