import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { RulesService, RuleTemplate } from '../../../core/services/rules.service';

@Component({
  selector: 'app-rules-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: `./rules-selector.component.html`,
  styleUrls: ['./rules-selector.component.scss']
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

  // ✅ CORREGIDO: Quitamos 'private' para que el HTML pueda llamarlo
  setupForm() {
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