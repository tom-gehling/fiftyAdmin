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
import { MultiSelectModule } from 'primeng/multiselect';

import { QuizTagsService } from '@/shared/services/quizTags.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';
import { QuizTag } from '@/shared/models/quizTags.model';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

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
    ProgressSpinnerModule,
    MultiSelectModule
  ],
  template: `
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
            <th>Quizzes Assigned</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-tag>
          <tr>
            <td>{{ tag.name }}</td>
            <td>{{ tag.isActive ? 'Yes' : 'No' }}</td>
            <td>{{ getQuizTitles(tag) }}</td>
            <td>
              <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-sm p-mr-2" (click)="editTag(tag)"></button>
              <button pButton type="button" icon="pi pi-trash" class="p-button-rounded p-button-sm p-button-danger" (click)="deleteTag(tag)"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-dialog [(visible)]="tagDialog" [modal]="true" [style]="{ width: '40rem' }" [baseZIndex]="10000" [contentStyle]="{ 'max-height': '70vh', 'overflow': 'auto' }">
  <ng-template #header>
    <span class="font-bold whitespace-nowrap">
      {{ isEditing ? 'Edit Tag' : 'New Tag' }}
    </span>
  </ng-template>

  <div class="p-fluid flex flex-col gap-4 pt-2">
    <div class="flex gap-4 items-center">
      <p-floatlabel class="flex-1" variant="on">
        <input pInputText id="tagName" [(ngModel)]="currentTagModel.name" autocomplete="off" class="w-full" [disabled]="saving" />
        <label for="tagName">Tag Name</label>
      </p-floatlabel>

      <div class="flex items-center gap-2">
        <p-checkbox id="tagActive" [(ngModel)]="currentTagModel.isActive" binary="true" [disabled]="saving"></p-checkbox>
        <label for="tagActive" class="font-semibold">Active</label>
      </div>
    </div>

    <div>
  <label class="font-semibold mb-1 block">Assign Quizzes</label>
  <p-table
    [value]="allQuizzes"
    [(selection)]="currentTagModel.quizIds"
    dataKey="id"
    [scrollable]="true"
    scrollHeight="300px"
    [virtualScroll]="true"
    [rows]="50"
    [virtualScrollItemSize]="40"
    selectionMode="multiple"
  >
    <ng-template pTemplate="header">
      <tr>
        <th style="width:3rem"></th>
        <th>Quiz Title</th>
        <th>Quiz Type</th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-quiz>
      <tr [pSelectableRow]="quiz">
        <td>
          <p-tableCheckbox [value]="quiz"></p-tableCheckbox>
        </td>
        <td>{{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}</td>
        <td>{{ getQuizTypeName(quiz.quizType) }}</td>
      </tr>
    </ng-template>
  </p-table>
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
  allQuizzes: Quiz[] = [];
  currentTag?: QuizTag;
  currentTagModel: Partial<QuizTag> = { quizIds: [] };
  tagDialog = false;
  isEditing = false;
  saving = false;

    quizType = [
      { value: QuizTypeEnum.Weekly, viewValue: 'Weekly' },
      { value: QuizTypeEnum.FiftyPlus, viewValue: 'Fifty+' },
      { value: QuizTypeEnum.Collab, viewValue: 'Collaboration' },
      { value: QuizTypeEnum.QuestionType, viewValue: 'Question-Type' }
    ];

  constructor(
    private tagService: QuizTagsService,
    private quizzesService: QuizzesService,
    private auth: AuthService,
    private notify: NotifyService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadTags();
    this.allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes()) || [];
  }

  loadTags() {
    this.tagService.getAllTags().subscribe(tags => {
      this.tags = tags.map(t => ({ ...t, quizIds: t.quizIds || [] }));
    });
  }

  getQuizTitles(tag: QuizTag) {
    return tag.quizIds?.map(id => this.allQuizzes.find(q => q.id === id)?.quizTitle || 'Quiz ' + id).join(', ') || '-';
  }

  openNewTagDialog() {
    this.currentTagModel = { name: '', isActive: true, quizIds: [] };
    this.isEditing = false;
    this.tagDialog = true;
  }

  editTag(tag: QuizTag) {
    this.currentTag = tag;
    this.currentTagModel = { ...tag, quizIds: [...(tag.quizIds || [])] };
    this.isEditing = true;
    this.tagDialog = true;
  }

  async saveTag() {
    if (!this.currentTagModel.name?.trim()) return;

    this.saving = true;
    try {
      if (this.isEditing && this.currentTag?.id) {
        await this.tagService.updateTag(this.currentTag.id, this.currentTagModel);
        this.notify.success('Tag updated successfully');
      } else {
        await this.tagService.createTag(this.currentTagModel);
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

  getQuizTypeName(quizTypeId: number){
    return this.quizType.find(x => x.value == quizTypeId)?.viewValue;
  }

  get quizOptions() {
    return this.allQuizzes.map(q => ({
      label: q.quizTitle || 'Quiz ' + q.quizId,
      value: q.id
    }));
  }
}
