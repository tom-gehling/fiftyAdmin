import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { OrderListModule } from 'primeng/orderlist';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import {
  SubmissionForm,
  SubmissionFormField,
  FieldType,
  DEFAULT_SUBMISSION_FIELDS
} from '@/shared/models/submissionForm.model';
import { SubmissionFormService } from '@/shared/services/submission-form.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
  selector: 'app-submission-form-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    TabsModule,
    DialogModule,
    SelectModule,
    FloatLabelModule,
    TextareaModule,
    OrderListModule,
    DragDropModule,
    ProgressSpinnerModule
  ],
  templateUrl: './submissionFormDetail.html'
})
export class SubmissionFormDetailComponent implements OnInit {
  id!: string;
  submissionForm!: SubmissionForm;
  form!: FormGroup;
  saving = false;
  tabSelected = '0';

  fieldDialog = false;
  editingFieldIndex: number | null = null;
  currentFieldModel: Partial<SubmissionFormField> = {};

  fieldTypes: { label: string; value: FieldType }[] = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Dropdown', value: 'dropdown' },
    { label: 'File Upload', value: 'file' },
    { label: 'User Tag', value: 'userTag' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private formService: SubmissionFormService,
    private authService: AuthService,
    private notify: NotifyService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(async params => {
      this.id = params.get('id') || '0';
      if (this.id && this.id !== '0') {
        await this.loadForm(this.id);
      } else {
        this.initializeEmptyForm();
      }
    });
  }

  private initializeEmptyForm(): void {
    this.submissionForm = {
      name: '',
      description: '',
      isActive: true,
      isDefault: false,
      createdBy: this.authService.currentUserId || '',
      createdAt: new Date(),
      fields: [...DEFAULT_SUBMISSION_FIELDS]
    };
    this.buildForm(this.submissionForm);
  }

  private async loadForm(id: string): Promise<void> {
    const formData = await this.formService.getFormById(id);
    if (formData) {
      this.submissionForm = formData;
      this.buildForm(this.submissionForm);
    } else {
      this.initializeEmptyForm();
    }
  }

  private buildForm(submissionForm: SubmissionForm): void {
    this.form = this.fb.group({
      name: [submissionForm.name || ''],
      description: [submissionForm.description || ''],
      isActive: [submissionForm.isActive ?? true],
      isDefault: [submissionForm.isDefault ?? false],
      fields: this.fb.array(
        (submissionForm.fields || []).map(field => this.createFieldGroup(field))
      )
    });
  }

  private createFieldGroup(field: SubmissionFormField): FormGroup {
    return this.fb.group({
      fieldId: [field.fieldId],
      fieldType: [field.fieldType],
      label: [field.label],
      placeholder: [field.placeholder || ''],
      required: [field.required ?? false],
      order: [field.order],
      options: [field.options || []],
      validation: this.fb.group({
        min: [field.validation?.min],
        max: [field.validation?.max],
        pattern: [field.validation?.pattern || ''],
        maxFileSize: [field.validation?.maxFileSize],
        allowedFileTypes: [field.validation?.allowedFileTypes || []]
      })
    });
  }

  get fields(): FormArray {
    return this.form.get('fields') as FormArray;
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    moveItemInArray(this.fields.controls as FormGroup[], event.previousIndex, event.currentIndex);
    this.updateFieldOrders();
  }

  private updateFieldOrders(): void {
    this.fields.controls.forEach((field, index) => {
      field.get('order')?.setValue(index + 1);
    });
  }

  openAddFieldDialog(): void {
    this.editingFieldIndex = null;
    this.currentFieldModel = {
      fieldId: this.generateFieldId(),
      fieldType: 'text',
      label: '',
      placeholder: '',
      required: false,
      order: this.fields.length + 1,
      options: [],
      validation: {}
    };
    this.fieldDialog = true;
  }

  editField(index: number): void {
    this.editingFieldIndex = index;
    const field = this.fields.at(index).value;
    this.currentFieldModel = { ...field };
    this.fieldDialog = true;
  }

  removeField(index: number): void {
    if (confirm('Are you sure you want to remove this field?')) {
      this.fields.removeAt(index);
      this.updateFieldOrders();
    }
  }

  saveField(): void {
    if (!this.currentFieldModel.label?.trim()) {
      this.notify.warn('Field label is required');
      return;
    }

    const fieldData: SubmissionFormField = {
      fieldId: this.currentFieldModel.fieldId || this.generateFieldId(),
      fieldType: this.currentFieldModel.fieldType || 'text',
      label: this.currentFieldModel.label.trim(),
      placeholder: this.currentFieldModel.placeholder?.trim() || '',
      required: this.currentFieldModel.required ?? false,
      order: this.currentFieldModel.order || this.fields.length + 1,
      options: this.currentFieldModel.options || [],
      validation: this.currentFieldModel.validation || {}
    };

    if (this.editingFieldIndex !== null) {
      this.fields.at(this.editingFieldIndex).patchValue(fieldData);
    } else {
      this.fields.push(this.createFieldGroup(fieldData));
    }

    this.updateFieldOrders();
    this.fieldDialog = false;
  }

  private generateFieldId(): string {
    return 'field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  closeFieldDialog(): void {
    this.fieldDialog = false;
  }

  getOptionsAsString(): string {
    return this.currentFieldModel.options?.join(', ') || '';
  }

  setOptionsFromString(value: string): void {
    this.currentFieldModel.options = value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  async saveForm(): Promise<void> {
    if (!this.form.get('name')?.value?.trim()) {
      this.notify.warn('Form name is required');
      return;
    }

    this.saving = true;
    try {
      const formData: Partial<SubmissionForm> = {
        name: this.form.get('name')?.value,
        description: this.form.get('description')?.value,
        isActive: this.form.get('isActive')?.value,
        isDefault: this.form.get('isDefault')?.value,
        fields: this.fields.value
      };

      if (this.id && this.id !== '0') {
        await this.formService.updateForm(this.id, formData);
        this.notify.success('Form updated successfully');
      } else {
        this.id = await this.formService.createForm(formData);
        this.notify.success('Form created successfully');
      }

      this.router.navigate(['/fiftyPlus/admin/submissionForms']);
    } catch (error) {
      console.error('Error saving form:', error);
      this.notify.error('Error saving form');
    } finally {
      this.saving = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/fiftyPlus/admin/submissionForms']);
  }

  getFieldTypeName(type: FieldType): string {
    return this.fieldTypes.find(t => t.value === type)?.label || type;
  }

  addDefaultFields(): void {
    DEFAULT_SUBMISSION_FIELDS.forEach(field => {
      const exists = this.fields.controls.some(
        f => f.get('fieldId')?.value === field.fieldId
      );
      if (!exists) {
        this.fields.push(this.createFieldGroup({ ...field, order: this.fields.length + 1 }));
      }
    });
    this.updateFieldOrders();
    this.notify.success('Default fields added');
  }
}
