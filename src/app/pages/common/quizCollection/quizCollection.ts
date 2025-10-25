import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { CardModule } from 'primeng/card';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizDisplayComponent } from "../quiz-display/quiz-display";
import { UserService } from '@/shared/services/user.service';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@/shared/services/auth.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { MembershipService, MembershipTier } from '@/shared/services/membership.service';

@Component({
  selector: 'app-quiz-collection',
  standalone: true,
  imports: [CommonModule, ButtonModule, DrawerModule, CardModule, QuizDisplayComponent],
  template: `
    <p-card class="flex flex-col h-full">
      <div class="flex items-center justify-center mb-4 relative">
      <p-button 
        icon="pi pi-chevron-right" 
        (onClick)="drawerVisible = true" 
        class="p-button-text p-button-sm absolute left-0">
      </p-button>
      <h2 class="text-xxl font-semibold">{{ title }}</h2>
    </div>

      <p-drawer [(visible)]="drawerVisible" position="left" [style]="{width: '300px'}">
        <h3>{{ title }}</h3>
        <ng-container *ngIf="quizHeaders.length > 0; else noQuizzes">
          <ul class="quiz-list">
            <li 
              *ngFor="let quiz of quizHeaders; let i = index" 
              [class.active]="quiz.quizId == selectedQuizId"
              (click)="selectQuiz(quiz.quizId)"
            >
              <span>
                {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
                <span *ngIf="completedQuizIds.has(quiz.quizId)" class="text-green-600 ml-2">✅</span>
              </span>
              <i 
            *ngIf="isLocked(i)" 
            class="pi pi-lock ml-2 text-gray-500" 
            title="Locked for your membership tier">
          </i>
            </li>
          </ul>
        </ng-container>
        <ng-template #noQuizzes>
          <p class="text-gray-500 mt-4">Sorry, no quizzes available currently!</p>
        </ng-template>
      </p-drawer>

      <div class="mt-10">
        <ng-container *ngIf="selectedQuizId; else noQuizSelected">
          <app-quiz-display [quizId]="selectedQuizId" [locked]="selectedQuizLocked"></app-quiz-display>
        </ng-container>
        <ng-template #noQuizSelected>
          <p class="text-center text-gray-400 mt-10">Select a quiz from the menu</p>
        </ng-template>
      </div>
    </p-card>
  `,
  styles: [`
    .quiz-list {
      list-style: none;
      padding: 0;
    }

    .quiz-list li {
      padding: 10px;
      margin-bottom: 5px;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #fefffeff; /* green border for all items */
      color: #4cfbab;
      transition: transform 0.3s ease, background-color 0.3s ease, color 0.3s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quiz-list li.active {
      transform: scaleX(1.1); /* grow width by 10% */
      background-color: #4cfbab;
      color: #000;
    }

    .quiz-list li:hover:not(.active) {
      background-color: #e0f7f1; /* subtle hover effect */
      color: #000;
    }
  `]
})
export class QuizCollectionComponent implements OnInit {
  @Input() title = 'Quizzes';
  @Input() quizType: 'archives' | 'exclusives' | 'collaborations' | 'questions' = 'archives';
  @Input() selectedQuizId?: string;
  selectedQuizLocked = false;
  drawerVisible = false;
  quizHeaders: { quizId: string; quizTitle?: string }[] = [];
  completedQuizIds = new Set<string>();
  membershipTier: MembershipTier = MembershipTier.Fifty;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private quizzesService: QuizzesService,
    private quizResultsService: QuizResultsService,
    private membershipService: MembershipService
  ) {}

  async ngOnInit() {
    this.membershipService.membership$.subscribe(tier => this.membershipTier = tier);
    // Step 1: Get the current user
    onAuthStateChanged(this.auth, async user => {
      if (!user) return;

      // Step 2: Fetch completed quizzes for this user
      const results = await firstValueFrom(this.quizResultsService.getUserResults(user.uid));
      results?.forEach(r => {
        if (r.status === 'completed') this.completedQuizIds.add(r.quizId);
      });

      // Step 3: Fetch quizzes headers
      let fetchHeaders$;
      switch (this.quizType) {
        case 'archives': fetchHeaders$ = this.quizzesService.getArchiveQuizzes(true); break;
        case 'exclusives': fetchHeaders$ = this.quizzesService.getExclusives(true); break;
        case 'collaborations': fetchHeaders$ = this.quizzesService.getCollaborations(true); break;
        case 'questions': fetchHeaders$ = this.quizzesService.getQuestionQuizzes(true); break;
        default: fetchHeaders$ = this.quizzesService.getArchiveQuizzes(true);
      }
      fetchHeaders$.subscribe(headers => {
    this.quizHeaders = headers;

    // Auto-select quiz from route or default to first
    if (this.selectedQuizId && headers.some(q => q.quizId === this.selectedQuizId)) {
      this.selectQuiz(this.selectedQuizId);
    } else if (headers.length) {
      this.selectQuiz(headers[0].quizId);
    }
  });
    });
  }

  selectQuiz(id: string) {
  const index = this.quizHeaders.findIndex(q => q.quizId === id);
  if (index === -1) return; // invalid id

  this.selectedQuizId = id;
  this.selectedQuizLocked = this.isLocked(index); // new property
  this.drawerVisible = false;
}

  isLocked(index: number): boolean {
  // Premium/Gold/Admin have full access
  if (this.membershipTier !== MembershipTier.Fifty) {
    return false;
  }

  switch (this.quizType) {
    case 'archives':
      // Only last 3 weekly quizzes accessible
      return index >= 3;
    case 'exclusives':
    case 'collaborations':
    case 'questions':
      // All restricted for "Fifty" members
      return true;
    default:
      return false;
  }
}}
