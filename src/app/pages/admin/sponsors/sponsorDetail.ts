import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ColorPickerModule } from 'primeng/colorpicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { Sponsor } from '@/shared/models/sponsor.model';
import { SubmissionFormField, FieldType } from '@/shared/models/submissionForm.model';
import { SponsorService } from '@/shared/services/sponsor.service';
import { StorageService } from '@/shared/services/storage.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
    selector: 'app-sponsor-detail',
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
        ColorPickerModule,
        DragDropModule,
        ProgressSpinnerModule
    ],
    templateUrl: './sponsorDetail.html'
})
export class SponsorDetailComponent implements OnInit {
    @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

    id!: string;
    sponsor!: Sponsor;
    form!: FormGroup;
    saving = false;
    tabSelected = '0';

    imagePreview: string | null = null;
    selectedImageFile?: File;

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
        private sponsorService: SponsorService,
        private storageService: StorageService,
        private authService: AuthService,
        private notify: NotifyService
    ) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe(async (params) => {
            this.id = params.get('id') || '0';
            if (this.id && this.id !== '0') {
                await this.loadSponsor(this.id);
            } else {
                this.initializeEmptySponsor();
            }
        });
    }

    private initializeEmptySponsor(): void {
        this.sponsor = {
            name: '',
            imageUrl: '',
            text: '',
            theme: { fontColor: '', tertiaryColor: '' },
            appendedFields: [],
            isActive: true,
            createdBy: this.authService.currentUserId || '',
            createdAt: new Date()
        };
        this.imagePreview = null;
        this.selectedImageFile = undefined;
        this.buildForm(this.sponsor);
    }

    private async loadSponsor(id: string): Promise<void> {
        const data = await this.sponsorService.getSponsorById(id);
        if (data) {
            this.sponsor = data;
            this.imagePreview = data.imageUrl || null;
            this.selectedImageFile = undefined;
            this.buildForm(this.sponsor);
        } else {
            this.initializeEmptySponsor();
        }
    }

    private buildForm(sponsor: Sponsor): void {
        const hasCustomColours = !!(sponsor.theme?.fontColor || sponsor.theme?.tertiaryColor);
        this.form = this.fb.group({
            name: [sponsor.name || '', Validators.required],
            text: [sponsor.text || ''],
            isActive: [sponsor.isActive ?? true],
            useCustomColours: [hasCustomColours],
            theme: this.fb.group({
                fontColor: [sponsor.theme?.fontColor || ''],
                tertiaryColor: [sponsor.theme?.tertiaryColor || '']
            }),
            appendedFields: this.fb.array((sponsor.appendedFields || []).map((field) => this.createFieldGroup(field)))
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

    get appendedFields(): FormArray {
        return this.form.get('appendedFields') as FormArray;
    }

    drop(event: CdkDragDrop<FormGroup[]>): void {
        moveItemInArray(this.appendedFields.controls as FormGroup[], event.previousIndex, event.currentIndex);
        this.updateFieldOrders();
    }

    private updateFieldOrders(): void {
        this.appendedFields.controls.forEach((field, index) => {
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
            order: this.appendedFields.length + 1,
            options: [],
            validation: {}
        };
        this.fieldDialog = true;
    }

    editField(index: number): void {
        this.editingFieldIndex = index;
        const field = this.appendedFields.at(index).value;
        this.currentFieldModel = { ...field };
        this.fieldDialog = true;
    }

    removeField(index: number): void {
        if (confirm('Are you sure you want to remove this field?')) {
            this.appendedFields.removeAt(index);
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
            order: this.currentFieldModel.order || this.appendedFields.length + 1,
            options: this.currentFieldModel.options || [],
            validation: this.currentFieldModel.validation || {}
        };

        if (this.editingFieldIndex !== null) {
            this.appendedFields.at(this.editingFieldIndex).patchValue(fieldData);
        } else {
            this.appendedFields.push(this.createFieldGroup(fieldData));
        }

        this.updateFieldOrders();
        this.fieldDialog = false;
    }

    private generateFieldId(): string {
        return 'sponsor_field_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }

    onImageSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        this.selectedImageFile = file;
        const reader = new FileReader();
        reader.onload = () => (this.imagePreview = reader.result as string);
        reader.readAsDataURL(file);
    }

    removeImage(): void {
        this.imagePreview = null;
        this.selectedImageFile = undefined;
        if (this.imageInput) {
            this.imageInput.nativeElement.value = '';
        }
    }

    toPickerHex(value: string): string {
        return value ? value.replace('#', '') : '';
    }

    fromPickerHex(value: string): string {
        if (!value) return '';
        return value.startsWith('#') ? value : '#' + value;
    }

    clearColour(controlPath: string): void {
        this.form.get(controlPath)?.setValue('');
    }

    async saveSponsor(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.warn('Sponsor name is required');
            return;
        }

        this.saving = true;
        try {
            let imageUrl = this.id !== '0' ? this.sponsor.imageUrl || '' : '';
            if (this.selectedImageFile) {
                const sponsorId = this.sponsor.id || Date.now().toString();
                imageUrl = await this.storageService.uploadSponsorLogo(this.selectedImageFile, sponsorId);
            } else if (!this.imagePreview) {
                imageUrl = '';
            }

            const v = this.form.value;
            const payload: Partial<Sponsor> = {
                name: v.name,
                imageUrl,
                text: v.text,
                isActive: v.isActive,
                theme: v.useCustomColours
                    ? {
                          fontColor: v.theme.fontColor || '',
                          tertiaryColor: v.theme.tertiaryColor || ''
                      }
                    : { fontColor: '', tertiaryColor: '' },
                appendedFields: this.appendedFields.value
            };

            if (this.id && this.id !== '0') {
                await this.sponsorService.updateSponsor(this.id, payload);
                this.notify.success('Sponsor updated successfully');
            } else {
                this.id = await this.sponsorService.createSponsor(payload);
                this.notify.success('Sponsor created successfully');
            }

            this.router.navigate(['/fiftyPlus/admin/sponsors']);
        } catch (error) {
            console.error('Error saving sponsor:', error);
            this.notify.error('Error saving sponsor');
        } finally {
            this.saving = false;
        }
    }

    cancel(): void {
        this.router.navigate(['/fiftyPlus/admin/sponsors']);
    }

    getFieldTypeName(type: FieldType): string {
        return this.fieldTypes.find((t) => t.value === type)?.label || type;
    }
}
