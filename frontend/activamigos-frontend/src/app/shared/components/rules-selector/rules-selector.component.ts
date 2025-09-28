import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { RulesService, RuleTemplate } from '../../../core/services/rules.service';

@Component({
  selector: 'app-rules-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          📋 Seleccionar Reglas
        </h3>
        <p class="text-sm text-gray-600">
          Elige las reglas que se aplicarán a {{ contextType === 'GROUP' ? 'este grupo' : 'esta actividad' }}.
        </p>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="text-center py-8">
        <div class="inline-flex items-center space-x-2">
          <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-gray-500">Cargando reglas...</span>
        </div>
      </div>

      <!-- Rules Form -->
      <form [formGroup]="rulesForm" *ngIf="!isLoading">
        <div class="space-y-3">
          <div 
            *ngFor="let template of availableTemplates; let i = index; trackBy: trackByTemplateId"
            class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            [class.bg-blue-50]="isRuleSelected(template.id)"
            [class.border-blue-400]="isRuleSelected(template.id)"
          >
            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                class="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                [formControlName]="i"
                (change)="onRuleToggle(template.id, $event)"
              />
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="text-xl" [attr.aria-hidden]="true">{{ template.icon }}</span>
                  <h4 class="font-medium text-gray-900">{{ template.title }}</h4>
                </div>
                <p class="text-sm text-gray-600">{{ template.description }}</p>
                
                <!-- Rule type badge -->
                <div class="mt-2">
                  <span 
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    [class.bg-green-100]="template.rule_type === 'GROUP'"
                    [class.text-green-800]="template.rule_type === 'GROUP'"
                    [class.bg-blue-100]="template.rule_type === 'ACTIVITY'"
                    [class.text-blue-800]="template.rule_type === 'ACTIVITY'"
                    [class.bg-purple-100]="template.rule_type === 'BOTH'"
                    [class.text-purple-800]="template.rule_type === 'BOTH'"
                  >
                    {{ getRuleTypeLabel(template.rule_type) }}
                  </span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- No rules available -->
        <div *ngIf="availableTemplates.length === 0" class="text-center py-8">
          <div class="text-4xl mb-2">📋</div>
          <p class="text-gray-600">No hay reglas disponibles para este tipo.</p>
        </div>
      </form>

      <!-- Selected Rules Summary -->
      <div *ngIf="selectedRuleIds.length > 0" class="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-2">
          Reglas seleccionadas ({{ selectedRuleIds.length }})
        </h4>
        <div class="flex flex-wrap gap-2">
          <span 
            *ngFor="let template of getSelectedTemplates()"
            class="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            <span>{{ template.icon }}</span>
            <span>{{ template.title }}</span>
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          (click)="onCancel()"
          [disabled]="isSaving"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          (click)="onSave()"
          [disabled]="isSaving"
        >
          <span *ngIf="!isSaving">Guardar Reglas</span>
          <span *ngIf="isSaving" class="flex items-center justify-center">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Guardando...
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .border-gray-200 {
        border-color: #374151 !important;
      }
      
      .bg-blue-50 {
        background-color: #dbeafe !important;
        border-color: #2563eb !important;
      }
    }
    
    /* Large text support */
    @media (min-width: 1024px) {
      .text-sm {
        font-size: 0.95rem;
      }
      
      .text-xs {
        font-size: 0.8rem;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .animate-spin {
        animation: none;
      }
    }
  `]
})
export class RulesSelectorComponent implements OnInit {
  @Input() contextType: 'GROUP' | 'ACTIVITY' = 'GROUP';
  @Input() contextId: number = 0; // Optional for creation mode
  @Input() preselectedRuleIds: number[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<number[]>();

  rulesForm: FormGroup;
  availableTemplates: RuleTemplate[] = [];
  selectedRuleIds: number[] = [];
  isLoading = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private rulesService: RulesService
  ) {
    this.rulesForm = this.fb.group({});
  }

  ngOnInit() {
    this.selectedRuleIds = [...this.preselectedRuleIds];
    this.loadAvailableTemplates();
  }

  private loadAvailableTemplates() {
    this.isLoading = true;
    
    this.rulesService.getRuleTemplates(this.contextType).subscribe({
      next: (response) => {
        this.availableTemplates = response.templates;
        this.setupForm();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading rule templates:', error);
        this.isLoading = false;
      }
    });
  }

  private setupForm() {
    const controls: any = {};
    
    this.availableTemplates.forEach((template, index) => {
      controls[index] = [this.selectedRuleIds.includes(template.id)];
    });
    
    this.rulesForm = this.fb.group(controls);
  }

  onRuleToggle(templateId: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedRuleIds.includes(templateId)) {
        this.selectedRuleIds.push(templateId);
      }
    } else {
      this.selectedRuleIds = this.selectedRuleIds.filter(id => id !== templateId);
    }
  }

  isRuleSelected(templateId: number): boolean {
    return this.selectedRuleIds.includes(templateId);
  }

  getSelectedTemplates(): RuleTemplate[] {
    return this.availableTemplates.filter(template => 
      this.selectedRuleIds.includes(template.id)
    );
  }

  getRuleTypeLabel(ruleType: string): string {
    switch (ruleType) {
      case 'GROUP':
        return 'Solo grupos';
      case 'ACTIVITY':
        return 'Solo actividades';
      case 'BOTH':
        return 'Ambos';
      default:
        return ruleType;
    }
  }

  trackByTemplateId(index: number, template: RuleTemplate): number {
    return template.id;
  }

  onCancel() {
    this.cancel.emit();
  }

  onSave() {
    if (this.isSaving) return;

    this.isSaving = true;
    this.save.emit(this.selectedRuleIds);
  }

  // Method to be called by parent component when save is complete
  onSaveComplete() {
    this.isSaving = false;
  }

  // Method to be called by parent component when save fails
  onSaveError() {
    this.isSaving = false;
  }
}