import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTag } from '@/shared/models/quizTags.model';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
  selector: 'app-quiz-tags',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    FormsModule,
    CheckboxModule,
    FloatLabelModule,
    ProgressSpinnerModule
  ],
  template: `
    <!-- Full-screen spinner while saving -->
    <div *ngIf="saving" class="fixed inset-0 flex items-center justify-center z-50">
      <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
    </div>

    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">Quiz Tags</h2>
      <button pButton type="button" label="Add Tag" icon="pi pi-plus" (click)="openNewTagDialog()"></button>

      <p-table [value]="tags" class="mt-4">
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-tag>
          <tr>
            <td>{{ tag.name }}</td>
            <td>{{ tag.isActive ? 'Yes' : 'No' }}</td>
            <td>
              <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-sm p-mr-2" (click)="editTag(tag)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-rounded p-button-sm p-button-danger" (click)="deleteTag(tag)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog [(visible)]="tagDialog" [modal]="true" [style]="{ width: '30rem' }">
        <ng-template #header>
          <span class="font-bold whitespace-nowrap">
            {{ isEditing ? 'Edit Tag' : 'New Tag' }}
          </span>
        </ng-template>

        <div class="p-fluid flex gap-4 items-center pt-2">
          <p-floatlabel class="flex-1" variant="on">
            <input pInputText id="tagName" [(ngModel)]="currentTagModel.name" autocomplete="off" class="w-full" [disabled]="saving" />
            <label for="tagName">Tag Name</label>
          </p-floatlabel>

          <div class="flex items-center gap-2">
            <p-checkbox id="tagActive" [(ngModel)]="currentTagModel.isActive" binary="true" [disabled]="saving"></p-checkbox>
            <label for="tagActive" class="font-semibold">Active</label>
          </div>
        </div>

        <ng-template #footer>
          <p-button label="Cancel" [text]="true" severity="secondary" (click)="closeDialog()" [disabled]="saving" />
          <p-button label="Save" [outlined]="true" severity="secondary" (click)="saveTag()" [disabled]="saving" />
        </ng-template>
      </p-dialog>
    </div>
  `
})
export class QuizTagsComponent implements OnInit {
  tags: QuizTag[] = [];
  currentTag?: QuizTag;
  currentTagModel: Partial<QuizTag> = {};
  tagDialog = false;
  isEditing = false;
  saving = false;

  constructor(
    private tagService: QuizTagsService,
    private auth: AuthService,
    private notify: NotifyService
  ) {}

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags() {
    this.tagService.getAllTags().subscribe(tags => {
      this.tags = tags;
    });
  }

  openNewTagDialog() {
    this.currentTagModel = { name: '', isActive: true };
    this.isEditing = false;
    this.tagDialog = true;
  }

  editTag(tag: QuizTag) {
    this.currentTag = tag;
    this.currentTagModel = { ...tag };
    this.isEditing = true;
    this.tagDialog = true;
  }

  async saveTag() {
    if (!this.currentTagModel.name?.trim()) return;

    this.saving = true;
    try {
      if (this.isEditing && this.currentTag?.id) {
        await this.tagService.updateTag(
          this.currentTag.id,
          this.currentTagModel.name,
          this.currentTagModel.isActive ?? true
        );
        this.notify.success('Tag updated successfully');
      } else {
        await this.tagService.createTag(
          this.currentTagModel.name,
          this.currentTagModel.isActive ?? true
        );
        this.notify.success('Tag created successfully');
      }

      this.tagDialog = false;
      this.loadTags();
    } catch (err) {
      console.error(err);
      this.notify.error('Error saving tag');
    } finally {
      this.saving = false;
    }
  }

  async deleteTag(tag: QuizTag) {
    if (!tag.id) return;

    if (confirm('Are you sure you want to delete this tag?')) {
      this.saving = true;
      try {
        await this.tagService.deleteTag(tag.id);
        this.loadTags();
        this.notify.success('Tag deleted successfully');
      } catch (err) {
        console.error(err);
        this.notify.error('Error deleting tag');
      } finally {
        this.saving = false;
      }
    }
  }

  closeDialog() {
    this.tagDialog = false;
  }
}
