import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TooltipModule } from 'primeng/tooltip';

import { CollaboratorsService } from '@/shared/services/collaborators.service';
import { Collaborator, DEFAULT_COLLABORATOR_THEME } from '@/shared/models/collaborator.model';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
    selector: 'app-collaborators',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, DialogModule, CheckboxModule, FloatLabelModule, CardModule, ColorPickerModule, TooltipModule],
    template: `
        <div *ngIf="saving" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
        </div>

        <p-card class="flex flex-col flex-1 p-4">
            <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h2>Collaborators</h2>
                <div class="flex flex-col sm:flex-row gap-2 ml-auto">
                    <p-iconfield class="flex-1 min-w-0 max-w-md">
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Search collaborators..." class="w-full" />
                    </p-iconfield>
                    <button pButton type="button" label="Add Collaborator" icon="pi pi-plus" (click)="openNewDialog()"></button>
                </div>
            </div>

            <div *ngIf="filtered.length > 0; else empty" class="overflow-x-auto rounded-lg">
                <table class="w-full" style="border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.06);">
                            <th class="text-left p-3">Name</th>
                            <th class="text-left p-3">Slug</th>
                            <th class="text-left p-3 hidden md:table-cell">Theme</th>
                            <th class="text-center p-3">Active</th>
                            <th class="p-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let c of filtered" class="cursor-pointer transition-colors" style="background: rgba(255,255,255,0.04); border-bottom: 1px solid var(--fifty-neon-green);" (click)="edit(c)">
                            <td class="p-3 font-semibold">
                                {{ c.name }}
                                <i *ngIf="needsReview(c)" class="pi pi-exclamation-triangle text-yellow-400 ml-2" pTooltip="Slug or theme missing — click to configure"></i>
                            </td>
                            <td class="p-3 font-mono text-sm">{{ c.slug || '—' }}</td>
                            <td class="p-3 hidden md:table-cell">
                                <div class="flex items-center gap-1">
                                    <div class="w-5 h-5 rounded border border-surface-300" [style.background]="c.theme.fontColor" [pTooltip]="'Font: ' + c.theme.fontColor"></div>
                                    <div class="w-5 h-5 rounded border border-surface-300" [style.background]="c.theme.backgroundColor" [pTooltip]="'Background: ' + c.theme.backgroundColor"></div>
                                    <div class="w-5 h-5 rounded border border-surface-300" [style.background]="c.theme.tertiaryColor" [pTooltip]="'Tertiary: ' + c.theme.tertiaryColor"></div>
                                </div>
                            </td>
                            <td class="p-3 text-center">
                                <i [class]="c.isActive !== false ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
                            </td>
                            <td class="p-3 text-right">
                                <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="edit(c); $event.stopPropagation()"></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <ng-template #empty>
                <div class="text-center text-gray-500 py-4">No collaborators found</div>
            </ng-template>

            <p-dialog [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '40rem', maxWidth: '95vw' }" [baseZIndex]="10000" [contentStyle]="{ 'max-height': '75vh', overflow: 'auto' }">
                <ng-template #header>
                    <span class="font-bold">{{ isEditing ? 'Edit Collaborator' : 'New Collaborator' }}</span>
                </ng-template>

                <form [formGroup]="form" class="p-fluid flex flex-col gap-4 pt-2">
                    <div class="flex gap-4 items-start">
                        <p-floatlabel class="flex-1" variant="on">
                            <input pInputText id="name" formControlName="name" autocomplete="off" class="w-full" (blur)="onNameBlur()" />
                            <label for="name">Collaborator Name *</label>
                        </p-floatlabel>
                        <div class="flex items-center gap-2 pt-3">
                            <p-checkbox id="isActive" formControlName="isActive" binary="true"></p-checkbox>
                            <label for="isActive" class="font-semibold">Active</label>
                        </div>
                    </div>

                    <p-floatlabel variant="on">
                        <input pInputText id="slug" formControlName="slug" autocomplete="off" class="w-full font-mono" placeholder="my-collab" />
                        <label for="slug">URL Slug *</label>
                    </p-floatlabel>
                    <div class="text-xs text-gray-400 -mt-2">
                        Public quiz URL: <span class="font-mono">/fiftyPlus/collabs/{{ form.get('slug')?.value || 'slug' }}/&lt;quizId&gt;</span>
                    </div>
                    <div *ngIf="form.get('slug')?.errors?.['pattern'] && form.get('slug')?.touched" class="text-xs text-red-400 -mt-2">Slug must be lowercase, numbers, and hyphens only.</div>
                    <div *ngIf="form.get('slug')?.errors?.['notUnique'] && form.get('slug')?.touched" class="text-xs text-red-400 -mt-2">This slug is already taken.</div>

                    <div formGroupName="theme" class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        <div class="flex flex-col items-center gap-3">
                            <label class="font-medium text-center">Font Colour</label>
                            <p-colorPicker [ngModel]="toPickerHex(form.get('theme.fontColor')?.value)" (ngModelChange)="form.get('theme.fontColor')?.setValue(fromPickerHex($event))" [ngModelOptions]="{ standalone: true }"></p-colorPicker>
                            <div class="flex items-center gap-2 w-full">
                                <div class="w-8 h-8 rounded border border-surface-300 flex-shrink-0" [style.background-color]="form.get('theme.fontColor')?.value"></div>
                                <input pInputText type="text" class="min-w-0 w-full font-mono text-sm" [value]="form.get('theme.fontColor')?.value || ''" (input)="form.get('theme.fontColor')?.setValue(fromPickerHex($any($event.target).value))" placeholder="#fbe2df" />
                            </div>
                        </div>
                        <div class="flex flex-col items-center gap-3">
                            <label class="font-medium text-center">Background Colour</label>
                            <p-colorPicker [ngModel]="toPickerHex(form.get('theme.backgroundColor')?.value)" (ngModelChange)="form.get('theme.backgroundColor')?.setValue(fromPickerHex($event))" [ngModelOptions]="{ standalone: true }"></p-colorPicker>
                            <div class="flex items-center gap-2 w-full">
                                <div class="w-8 h-8 rounded border border-surface-300 flex-shrink-0" [style.background-color]="form.get('theme.backgroundColor')?.value"></div>
                                <input pInputText type="text" class="min-w-0 w-full font-mono text-sm" [value]="form.get('theme.backgroundColor')?.value || ''" (input)="form.get('theme.backgroundColor')?.setValue(fromPickerHex($any($event.target).value))" placeholder="#677c73" />
                            </div>
                        </div>
                        <div class="flex flex-col items-center gap-3">
                            <label class="font-medium text-center">Tertiary Colour</label>
                            <p-colorPicker [ngModel]="toPickerHex(form.get('theme.tertiaryColor')?.value)" (ngModelChange)="form.get('theme.tertiaryColor')?.setValue(fromPickerHex($event))" [ngModelOptions]="{ standalone: true }"></p-colorPicker>
                            <div class="flex items-center gap-2 w-full">
                                <div class="w-8 h-8 rounded border border-surface-300 flex-shrink-0" [style.background-color]="form.get('theme.tertiaryColor')?.value"></div>
                                <input pInputText type="text" class="min-w-0 w-full font-mono text-sm" [value]="form.get('theme.tertiaryColor')?.value || ''" (input)="form.get('theme.tertiaryColor')?.setValue(fromPickerHex($any($event.target).value))" placeholder="#4cfbab" />
                            </div>
                        </div>
                    </div>
                </form>

                <ng-template #footer>
                    <p-button label="Cancel" [text]="true" severity="secondary" (click)="closeDialog()" [disabled]="saving" />
                    <p-button label="Save" [outlined]="true" [severity]="saving || form.invalid ? 'secondary' : 'success'" (click)="save()" [disabled]="saving || form.invalid" />
                </ng-template>
            </p-dialog>
        </p-card>
    `
})
export class CollaboratorsComponent implements OnInit {
    collaborators: Collaborator[] = [];
    filtered: Collaborator[] = [];
    searchTerm = '';
    dialogVisible = false;
    isEditing = false;
    saving = false;
    selected: Collaborator | null = null;
    form!: FormGroup;
    private slugManuallyEdited = false;

    constructor(
        private fb: FormBuilder,
        private service: CollaboratorsService,
        private notify: NotifyService
    ) {
        this.createForm();
    }

    ngOnInit(): void {
        this.service.getAll().subscribe((items) => {
            this.collaborators = items;
            this.applySearch();
        });
    }

    private createForm(): void {
        this.form = this.fb.group({
            name: ['', Validators.required],
            slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), this.slugUniqueValidator()]],
            isActive: [true],
            theme: this.fb.group({
                fontColor: [DEFAULT_COLLABORATOR_THEME.fontColor],
                backgroundColor: [DEFAULT_COLLABORATOR_THEME.backgroundColor],
                tertiaryColor: [DEFAULT_COLLABORATOR_THEME.tertiaryColor]
            })
        });

        this.form.get('slug')?.valueChanges.subscribe(() => {
            this.slugManuallyEdited = true;
        });
    }

    private slugUniqueValidator(): ValidatorFn {
        return (ctrl: AbstractControl): ValidationErrors | null => {
            const slug = (ctrl.value || '').toString().trim();
            if (!slug) return null;
            const excludeId = this.selected?.id;
            return this.service.isSlugAvailable(slug, excludeId) ? null : { notUnique: true };
        };
    }

    private slugify(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    onNameBlur(): void {
        if (this.slugManuallyEdited) return;
        const name = this.form.get('name')?.value || '';
        if (!name) return;
        const slug = this.slugify(name);
        const slugCtrl = this.form.get('slug');
        if (slugCtrl && !slugCtrl.value) {
            slugCtrl.setValue(slug);
            this.slugManuallyEdited = false;
        }
    }

    onSearch(): void {
        this.applySearch();
    }

    private applySearch(): void {
        const term = this.searchTerm.toLowerCase().trim();
        this.filtered = term ? this.collaborators.filter((c) => c.name.toLowerCase().includes(term) || c.slug?.toLowerCase().includes(term)) : [...this.collaborators];
    }

    needsReview(c: Collaborator): boolean {
        return !c.slug;
    }

    openNewDialog(): void {
        this.selected = null;
        this.isEditing = false;
        this.slugManuallyEdited = false;
        this.form.reset({
            name: '',
            slug: '',
            isActive: true,
            theme: { ...DEFAULT_COLLABORATOR_THEME }
        });
        this.dialogVisible = true;
    }

    edit(c: Collaborator): void {
        this.selected = c;
        this.isEditing = true;
        this.slugManuallyEdited = true;
        this.form.reset({
            name: c.name,
            slug: c.slug || '',
            isActive: c.isActive !== false,
            theme: {
                fontColor: c.theme.fontColor,
                backgroundColor: c.theme.backgroundColor,
                tertiaryColor: c.theme.tertiaryColor
            }
        });
        this.dialogVisible = true;
    }

    closeDialog(): void {
        this.dialogVisible = false;
    }

    async save(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.notify.error('Please fix the form errors');
            return;
        }
        this.saving = true;
        try {
            const v = this.form.value;
            const payload = {
                name: v.name,
                slug: v.slug,
                isActive: v.isActive,
                theme: { ...v.theme }
            };
            if (this.isEditing && this.selected?.id) {
                await this.service.update(this.selected.id, payload);
                this.notify.success('Collaborator updated');
            } else {
                await this.service.create(payload);
                this.notify.success('Collaborator created');
            }
            this.dialogVisible = false;
        } catch (err) {
            console.error(err);
            this.notify.error('Failed to save collaborator');
        } finally {
            this.saving = false;
        }
    }

    toPickerHex(value: string): string {
        return value ? value.replace('#', '') : '';
    }

    fromPickerHex(value: string): string {
        if (!value) return '';
        return value.startsWith('#') ? value : '#' + value;
    }
}
