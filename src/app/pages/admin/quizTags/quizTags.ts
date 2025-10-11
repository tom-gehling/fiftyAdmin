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
import { OrderListModule } from 'primeng/orderlist';
import { CardModule } from 'primeng/card';

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
    MultiSelectModule,
    OrderListModule,
    CardModule
  ],
  template: `
    <div *ngIf="saving" class="fixed inset-0 flex items-center justify-center z-50">
  <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
</div>

<p-card class="flex flex-col flex-1 p-4 overflow-hidden">
  <div class="flex justify-between items-center mb-4 gap-2">
    <div class="flex gap-2">
      <button pButton type="button" label="Add Tag" icon="pi pi-plus" (click)="openNewTagDialog()"></button>
      <button pButton label="Save Order" icon="pi pi-save" (click)="saveOrder()" [disabled]="saving"></button>
    </div>
  </div>
    <div class="flex justify-between items-center p-2 w-full">
      <!-- [ ]: fix the spacing of the headers -->
    <div>Name</div>
    <div>Active</div>
    <div>Quizzes Assigned</div>
    <div>Actions</div>
  </div>

  <p-orderList 
    [value]="tags" 
    dragdrop="true" 
    dataKey="id"
    [style]="{width:'100%', flex:1}"
    scrollHeight = 100%
  >
    <ng-template let-tag pTemplate="item">
      <div class="flex justify-between items-center p-2 border-gray-200 rounded shadow mb-1 w-full">
        <div class="flex-1">{{ tag.name }}</div>
        <div class="flex-1">{{ tag.isActive ? 'Yes' : 'No' }}</div>
        <div class="flex-1">{{ getQuizTitles(tag) }}</div>
        <div class="flex gap-2">
          <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-sm" (click)="editTag(tag)"></button>
          <button pButton type="button" icon="pi pi-trash" class="p-button-rounded p-button-sm p-button-danger" (click)="deleteTag(tag)"></button>
        </div>
      </div>
    </ng-template>
  </p-orderList>

  <p-dialog [(visible)]="tagDialog" [modal]="true" [style]="{ width: '40rem' }" [baseZIndex]="10000" [contentStyle]="{ 'max-height': '70vh', 'overflow': 'auto' }">
    <ng-template #header>
      <span class="font-bold whitespace-nowrap">
        {{ isEditing ? 'Edit Tag' : 'New Tag' }}
      </span>
    </ng-template>

    <div class="p-fluid flex flex-col gap-4 pt-2">
      <div class="flex gap-4 items-center">
        <p-floatlabel class="flex-1" variant="on">
          <input pInputText id="tagName"  name="tagName" [(ngModel)]="currentTagModel.name" autocomplete="off" class="w-full" [disabled]="saving" />
          <label for="tagName">Tag Name</label>
        </p-floatlabel>

        <div class="flex items-center gap-2">
          <p-checkbox id="tagActive" name="tagActive" [(ngModel)]="currentTagModel.isActive" binary="true" [disabled]="saving"></p-checkbox>
          <label for="tagActive" class="font-semibold">Active</label>
        </div>
      </div>

      <div>
        <label class="font-semibold mb-1 block">Assign Quizzes</label>
        <p-table
          [value]="allQuizzes"
          [(selection)]="selectedQuizzes"
          dataKey="quizId"
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
</p-card>

  `
})
export class QuizTagsComponent implements OnInit {
  tags: QuizTag[] = [];
  allQuizzes: any[] = [];
  currentTag?: QuizTag;
  currentTagModel: Partial<QuizTag> = { quizIds: [] };
  selectedQuizzes: any[] = [];
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
    const quizzes = await firstValueFrom(this.quizzesService.getAllQuizzes()) || [];
this.allQuizzes = quizzes.map(q => ({
  quizId: q.quizId,
  quizTitle: q.quizTitle || 'Quiz ' + q.quizId,
  quizType: q.quizType
}));
  }

  loadTags() {
    this.tagService.getAllTags().subscribe(tags => {
      this.tags = tags.map(t => ({ ...t, quizIds: t.quizIds || [] })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));;
    });
  }

 getQuizTitles(tag: QuizTag) {
  return tag.quizIds
    ?.map(id => this.allQuizzes.find(q => q.quizId === id)?.quizTitle || 'Quiz ' + id)
    .join(', ') || '-';
}

  get orderedTags(): QuizTag[] {
    return [...this.tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async saveOrder() {
  this.saving = true;
  try {
    // Update each tag's order based on current array index
    await Promise.all(
      this.tags.map((tag, index) => 
        this.tagService.updateTag(tag.id!, { order: index })
      )
    );
    this.notify.success('Tag order saved successfully');
  } catch (err) {
    console.error(err);
    this.notify.error('Error saving tag order');
  } finally {
    this.saving = false;
  }
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
      this.currentTagModel.quizIds = this.selectedQuizzes.map(q => q.quizId);
      this.selectedQuizzes = []
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
    value: q.quizId
  }));
}
}
