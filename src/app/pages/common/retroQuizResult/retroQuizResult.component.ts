import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Auth } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { UserTagSelectorComponent } from '../userTagSelector/userTagSelector.component';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { TaggedUser } from '@/shared/models/quizSubmission.model';

@Component({
  selector: 'app-retro-quiz-result',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputNumberModule, UserTagSelectorComponent],
  template: `
    <div class="flex flex-col gap-4 p-1">
      <p class="text-gray-500">Manually record a score for this quiz</p>

      <div class="flex flex-col gap-1">
        <label class="font-semibold">Score</label>
        <p-inputNumber
          [(ngModel)]="score"
          [min]="0"
          [max]="totalQuestions"
          [showButtons]="true"
          placeholder="Enter score"
        ></p-inputNumber>
      </div>

      <!-- <div class="flex flex-col gap-1">
        <label class="font-semibold">Tag Teammates</label>
        <app-user-tag-selector
          [(selectedUsers)]="taggedUsers"
          placeholder="Search for teammates..."
        ></app-user-tag-selector>
      </div> -->

      <div class="flex justify-end gap-2 mt-2">
        <p-button label="Cancel" severity="secondary" (onClick)="cancel()"></p-button>
        <p-button label="Save Result" (onClick)="save()" [disabled]="score == null || !totalQuestions"></p-button>
      </div>
    </div>
  `
})
export class RetroQuizResultComponent implements OnInit {
  quizId: string = '';
  quizTitle: string = '';
  totalQuestions: number = 0;
  score: number | null = null;
  taggedUsers: TaggedUser[] = [];

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: DynamicDialogConfig,
    private auth: Auth,
    private quizResultsService: QuizResultsService,
    private quizzesService: QuizzesService
  ) {
    this.quizId = config.data?.quizId ?? '';
    this.quizTitle = config.data?.quizTitle ?? '';
  }

  async ngOnInit() {
    const quiz = await firstValueFrom(this.quizzesService.getQuizByQuizId(this.quizId));
    if (quiz) {
      this.totalQuestions = quiz.questions.length;
    }
  }

  async save() {
    if (this.score == null || !this.totalQuestions) return;
    const user = this.auth.currentUser;
    if (!user) return;

    await this.quizResultsService.createRetroResult(
      this.quizId,
      user.uid,
      this.score,
      this.totalQuestions,
      this.taggedUsers
    );

    this.ref.close({ saved: true });
  }

  cancel() {
    this.ref.close(null);
  }
}
