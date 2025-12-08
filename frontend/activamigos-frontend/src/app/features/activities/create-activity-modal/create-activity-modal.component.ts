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
  
  // Gestión de Pasos
  currentStep: 1 | 2 = 1;
  selectedRuleIds: number[] = [];
  
  // Feedback
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private activitiesService: ActivitiesService
  ) {
    this.activityForm = this.createForm();
  }

  ngOnInit() {}

  private createForm(): FormGroup {
    // Fecha por defecto: Mañana a las 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Ajuste zona horaria local para el input datetime-local
    const localIsoString = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]], // Títulos cortos y claros
      description: ['', [Validators.maxLength(200)]], // Descripciones concisas
      location: ['', [Validators.maxLength(50)]],
      date: [localIsoString, [Validators.required]],
    });
  }

  // --- Navegación del Wizard ---

  nextStep() {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
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
    // Si cancela la selección de reglas, volvemos al paso 1
    this.prevStep();
  }

  // --- Envío Final ---

  finalSubmit() {
    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.activityForm.value;
    
    // Preparar objeto para el backend
    const activityData: ActivityCreate = {
      title: formValue.title.trim(),
      description: formValue.description?.trim(),
      location: formValue.location?.trim(),
      date: new Date(formValue.date).toISOString(), // Convertir a UTC
      rule_ids: this.selectedRuleIds
    };

    this.activitiesService.createActivity(activityData).subscribe({
      next: () => {
        this.successMessage = '¡Actividad creada con éxito!';
        
        // Cerrar tras breve delay para ver el mensaje
        setTimeout(() => {
          this.activityCreated.emit();
          this.closeModal();
        }, 1500);
      },
      error: (error) => {
        console.error('Error creating activity:', error);
        this.errorMessage = 'No se pudo crear la actividad. Inténtalo de nuevo.';
        this.isSubmitting = false;
      }
    });
  }

  // --- Utilidades ---

  closeModal() {
    this.close.emit();
    // Resetear estado al cerrar (delay para que no se vea el flash)
    setTimeout(() => {
      this.resetForm();
    }, 300);
  }

  private resetForm() {
    this.activityForm.reset();
    // Restaurar fecha por defecto
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIsoString = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    
    this.activityForm.patchValue({ date: localIsoString });
    
    this.currentStep = 1;
    this.isSubmitting = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedRuleIds = [];
  }

  // Validaciones visuales
  isFieldInvalid(fieldName: string): boolean {
    const field = this.activityForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  onBackdropClick(event: Event) {
    if (this.isSubmitting) return; // No cerrar si está enviando
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}