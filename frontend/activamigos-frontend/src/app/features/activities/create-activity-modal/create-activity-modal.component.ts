import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivitiesService } from '../../../core/services/activities.service';
import { ActivityCreate } from '../../../core/models/activity.model';
import { RulesSelectorComponent } from '../../../shared/components/rules-selector/rules-selector.component';
import { GroupsService } from '../../../core/services/groups.service';
import { Group } from '../../../core/models/group.model';

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
  @ViewChild('activityImageInput') activityImageInput?: ElementRef<HTMLInputElement>;

  activityForm: FormGroup;
  isSubmitting = false;
  currentStep: 1 | 2 | 3 | 4 = 1;
  selectedRuleIds: number[] = [];
  availableGroups: Group[] = [];
  selectedImageFile: File | null = null;
  selectedImagePreviewUrl: string | null = null;

  activityTypes = [
    { value: 'sport', label: 'Deporte', icon: '⚽' },
    { value: 'social', label: 'Social', icon: '👥' },
    { value: 'culture', label: 'Cultura', icon: '🎭' },
    { value: 'academic', label: 'Estudios', icon: '📚' },
    { value: 'other', label: 'Otro', icon: '🌈' }
  ];

  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private activitiesService: ActivitiesService,
    private groupsService: GroupsService
  ) {
    this.activityForm = this.createForm();
  }

  ngOnInit() {
    this.loadAvailableGroups();
  }

  private createForm(): FormGroup {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIsoString = new Date(
      tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)
    ).toISOString().slice(0, 16);

    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      activity_types: [[], [Validators.required]],
      location: ['', [Validators.maxLength(50)]],
      group_id: [null],
      date: [localIsoString, [Validators.required]],
    });
  }

  private loadAvailableGroups() {
    this.groupsService.getGroups().subscribe({
      next: (groups) => {
        this.availableGroups = groups.filter(group => group.is_member);
      },
      error: () => {
        this.availableGroups = [];
      }
    });
  }

  nextStep() {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    const selectedDate = new Date(this.activityForm.get('date')?.value);
    if (selectedDate < new Date()) {
      this.errorMessage = 'La fecha no puede ser en el pasado. Elige una fecha futura.';
      return;
    }

    this.currentStep = 2;
    this.errorMessage = '';
  }

  goToGroupStep() {
    this.currentStep = 3;
    this.errorMessage = '';
  }

  goToRulesStep() {
    this.currentStep = 4;
    this.errorMessage = '';
  }

  prevStep() {
    if (this.currentStep === 4) this.currentStep = 3;
    else if (this.currentStep === 3) this.currentStep = 2;
    else this.currentStep = 1;
    this.errorMessage = '';
  }

  selectRelatedGroup(groupId: number | null) {
    this.activityForm.patchValue({ group_id: groupId });
  }

  isRelatedGroupSelected(groupId: number | null): boolean {
    return this.activityForm.get('group_id')?.value === groupId;
  }

  onRulesSave(ruleIds: number[]) {
    this.selectedRuleIds = ruleIds;
    this.finalSubmit();
  }

  onRulesCancel() {
    this.prevStep();
  }

  finalSubmit() {
    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.activityForm.value;
    const activityData: ActivityCreate = {
      title: formValue.title.trim(),
      description: formValue.description?.trim(),
      activity_types: formValue.activity_types,
      location: formValue.location?.trim(),
      group_id: formValue.group_id || null,
      date: new Date(formValue.date).toISOString(),
      rule_ids: this.selectedRuleIds
    };

    this.activitiesService.createActivity(activityData).subscribe({
      next: (activity) => {
        if (this.selectedImageFile) {
          this.activitiesService.uploadActivityImage(activity.id, this.selectedImageFile).subscribe({
            next: () => this.handleCreateSuccess(),
            error: () => {
              this.handleCreateSuccess('Actividad creada, pero no hemos podido subir la imagen.');
            }
          });
          return;
        }

        this.handleCreateSuccess();
      },
      error: () => {
        this.errorMessage = 'No se pudo crear la actividad. Inténtalo de nuevo.';
        this.isSubmitting = false;
      }
    });
  }

  closeModal() {
    this.close.emit();
    setTimeout(() => {
      this.resetForm();
    }, 300);
  }

  private resetForm() {
    this.activityForm.reset();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIsoString = new Date(
      tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)
    ).toISOString().slice(0, 16);

    this.activityForm.patchValue({
      date: localIsoString,
      group_id: null,
      activity_types: []
    });

    this.currentStep = 1;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedRuleIds = [];
    this.removeSelectedImage();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.activityForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  onBackdropClick(event: Event) {
    if (this.isSubmitting) return;
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  selectActivityType(type: string) {
    const currentTypes: string[] = this.activityForm.get('activity_types')?.value || [];
    const nextTypes = currentTypes.includes(type)
      ? currentTypes.filter(value => value !== type)
      : [...currentTypes, type];

    this.activityForm.patchValue({ activity_types: nextTypes });
    this.activityForm.get('activity_types')?.markAsTouched();
  }

  isActivityTypeSelected(type: string): boolean {
    const currentTypes: string[] = this.activityForm.get('activity_types')?.value || [];
    return currentTypes.includes(type);
  }

  openImagePicker() {
    this.activityImageInput?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Selecciona una imagen válida.';
      input.value = '';
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      this.errorMessage = 'La imagen es demasiado grande. El máximo es 16 MB.';
      input.value = '';
      return;
    }

    this.selectedImageFile = file;
    if (this.selectedImagePreviewUrl) {
      URL.revokeObjectURL(this.selectedImagePreviewUrl);
    }
    this.selectedImagePreviewUrl = URL.createObjectURL(file);
    this.errorMessage = '';
  }

  removeSelectedImage() {
    this.selectedImageFile = null;
    if (this.selectedImagePreviewUrl) {
      URL.revokeObjectURL(this.selectedImagePreviewUrl);
    }
    this.selectedImagePreviewUrl = null;
    if (this.activityImageInput?.nativeElement) {
      this.activityImageInput.nativeElement.value = '';
    }
  }

  private handleCreateSuccess(message = '¡Actividad creada con éxito!') {
    this.successMessage = message;
    this.isSubmitting = false;

    setTimeout(() => {
      this.activityCreated.emit();
      this.closeModal();
    }, 1500);
  }
}
