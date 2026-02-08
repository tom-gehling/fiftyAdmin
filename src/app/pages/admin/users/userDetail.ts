import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizResult } from '@/shared/models/quizResult.model';
import { Quiz } from '@/shared/models/quiz.model';

interface RecentQuiz {
  quizTitle: string;
  typeName: string;
  score: number;
  totalQuestions: number;
}

@Component({
  standalone: true,
  selector: 'app-user-detail',
  imports: [CommonModule, DialogModule, ProgressSpinnerModule],
  template: `
    <p-dialog
      [header]="user?.displayName || 'User Details'"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '500px' }"
      (onHide)="onClose()"
    >
      <div *ngIf="user" class="flex flex-col gap-4">
        <!-- User Info -->
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-2xl">
            <i class="pi pi-user"></i>
          </span>
          <div>
            <h3 class="text-xl font-semibold m-0">{{ user.displayName || 'Unknown' }}</h3>
            <div class="text-sm text-gray-500">{{ user.email || 'No email' }}</div>
          </div>
        </div>

        <div class="flex justify-center">
          <hr class="w-full border-t" style="border-color: var(--fifty-neon-green);"/>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Membership</div>
            <div class="text-lg font-semibold">{{ membershipType }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Joined</div>
            <div class="text-lg font-semibold">{{ formatDate(user.createdAt) }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Login Count</div>
            <div class="text-lg font-semibold">{{ user.loginCount ?? 0 }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Last Login</div>
            <div class="text-lg font-semibold">{{ formatDate(user.lastLoginAt ?? user.createdAt) }}</div>
          </div>
        </div>

        <div class="flex justify-center">
          <hr class="w-full border-t" style="border-color: var(--fifty-neon-green);"/>
        </div>

        <!-- Quiz Stats -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Quizzes Completed</div>
            <div class="text-lg font-semibold">{{ totalCompleted }}</div>
          </div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Correct Rate</div>
            <div class="text-lg font-semibold">{{ correctRate }}%</div>
          </div>
        </div>

        <div class="flex justify-center">
          <hr class="w-full border-t" style="border-color: var(--fifty-neon-green);"/>
        </div>

        <!-- Recent Quizzes -->
        <div>
          <div class="font-semibold text-md mb-3">Last 5 Quizzes</div>

          <div *ngIf="loadingQuizzes" class="flex justify-center py-4">
            <p-progressSpinner styleClass="w-8 h-8" strokeWidth="2"></p-progressSpinner>
          </div>

          <ul *ngIf="!loadingQuizzes && recentQuizzes.length" class="list-none p-0 m-0">
            <li *ngFor="let quiz of recentQuizzes" class="flex justify-between items-center mb-3">
              <div>
                <div class="font-medium text-surface-900 dark:text-surface-100">{{ quiz.quizTitle }}</div>
                <div class="text-sm text-gray-500">{{ quiz.typeName }}</div>
              </div>
              <span class="text-primary font-medium">{{ quiz.score }} / {{ quiz.totalQuestions }}</span>
            </li>
          </ul>

          <div *ngIf="!loadingQuizzes && !recentQuizzes.length" class="text-gray-500 text-sm">
            No completed quizzes.
          </div>
        </div>
      </div>
    </p-dialog>
  `
})
export class UserDetailComponent implements OnChanges {
  @Input() user: any;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  recentQuizzes: RecentQuiz[] = [];
  loadingQuizzes = false;
  totalCompleted = 0;
  correctRate = '0';
  membershipType = '—';

  constructor(
    private quizResultsService: QuizResultsService,
    private quizzesService: QuizzesService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user'] && this.user?.uid) {
      this.membershipType = this.user.isAdmin ? 'Admin' : this.user.isMember ? 'Member' : 'Guest';
      this.loadRecentQuizzes(this.user.uid);
    }
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private async loadRecentQuizzes(uid: string) {
    this.loadingQuizzes = true;
    this.recentQuizzes = [];
    this.totalCompleted = 0;
    this.correctRate = '0';

    const results: QuizResult[] = await firstValueFrom(
      this.quizResultsService.getUserResults(uid)
    );

    const completed = results.filter(r => r.status === 'completed');
    this.totalCompleted = completed.length;

    const totalScore = completed.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const totalQuestions = completed.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
    this.correctRate = totalQuestions > 0
      ? ((totalScore / totalQuestions) * 100).toFixed(1)
      : '0';

    const sorted = completed
      .sort((a, b) => {
        const getTime = (d: any) => {
          if (!d) return 0;
          if ('toMillis' in d) return d.toMillis();
          if (d instanceof Date) return d.getTime();
          return 0;
        };
        return getTime(b.completedAt) - getTime(a.completedAt);
      })
      .slice(0, 5);

    const quizzes: RecentQuiz[] = [];
    for (const r of sorted) {
      const quiz: Quiz | undefined = await firstValueFrom(
        this.quizzesService.getQuizByQuizId(r.quizId.toString())
      );
      quizzes.push({
        quizTitle: quiz?.quizTitle ?? 'Untitled Quiz',
        typeName: this.getTypeName(quiz?.quizType),
        score: r.score ?? 0,
        totalQuestions: r.totalQuestions || 1
      });
    }

    this.recentQuizzes = quizzes;
    this.loadingQuizzes = false;
  }

  formatDate(d: any): string {
    if (!d) return '—';
    const date = d?.toDate?.() ?? (d?.seconds ? new Date(d.seconds * 1000) : new Date(d));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  private getTypeName(type?: number): string {
    switch (type) {
      case 1: return 'Weekly';
      case 2: return 'Fifty+';
      case 3: return 'Collaboration';
      case 4: return 'Question Type';
      default: return 'Unknown';
    }
  }
}
