import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTag } from '@/shared/models/quizTags.model';

@Component({
  selector: 'app-quiz-tags',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, InputTextModule, DialogModule, FormsModule],
  template: `
    <div class="p-4">
      <h2 class="text-xl font-bold mb-4">Quiz Tags</h2>
      <button pButton type="button" label="Add Tag" icon="pi pi-plus" (click)="openNewTagDialog()"></button>

      <p-table [value]="tags" class="mt-4">
        <ng-template pTemplate="header">
          <tr>
            <th>Name</th>
            <th>Created By</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-tag>
          <tr>
            <td>{{ tag.name }}</td>
            <td>{{ tag.creationUser }}</td>
            <td>{{ tag.creationTime | date:'short' }}</td>
            <td>
              <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-sm p-mr-2" (click)="editTag(tag)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-rounded p-button-sm p-button-danger" (click)="deleteTag(tag)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog [(visible)]="tagDialog" header="{{ isEditing ? 'Edit Tag' : 'New Tag' }}" modal>
        <div class="p-fluid">
          <div class="p-field">
            <label for="tagName">Name</label>
            <input id="tagName" type="text" pInputText [(ngModel)]="currentTagName" />
          </div>
        </div>
        <p-footer>
          <button pButton type="button" label="Cancel" class="p-button-text" (click)="closeDialog()"></button>
          <button pButton type="button" label="Save" (click)="saveTag()"></button>
        </p-footer>
      </p-dialog>
    </div>
  `
})
export class QuizTagsComponent implements OnInit {
  tags: QuizTag[] = [];
  currentTag?: QuizTag;
  currentTagName: string = '';
  tagDialog = false;
  isEditing = false;

  constructor(private tagService: QuizTagsService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadTags();
  }

  loadTags() {
    this.tagService.getAllTags().subscribe(tags => {
      this.tags = tags;
    });
  }

  openNewTagDialog() {
    this.currentTag = undefined;
    this.currentTagName = '';
    this.isEditing = false;
    this.tagDialog = true;
  }

  editTag(tag: QuizTag) {
    this.currentTag = tag;
    this.currentTagName = tag.name;
    this.isEditing = true;
    this.tagDialog = true;
  }

  async saveTag() {
    if (!this.currentTagName.trim()) return;

    if (this.isEditing && this.currentTag?.id) {
      await this.tagService.updateTag(this.currentTag.id, this.currentTagName);
    } else {
      await this.tagService.createTag(this.currentTagName);
    }

    this.tagDialog = false;
    this.loadTags();
  }

  async deleteTag(tag: QuizTag) {
    if (!tag.id) return;
    if (confirm('Are you sure you want to delete this tag?')) {
      await this.tagService.deleteTag(tag.id);
      this.loadTags();
    }
  }

  closeDialog() {
    this.tagDialog = false;
  }
}
