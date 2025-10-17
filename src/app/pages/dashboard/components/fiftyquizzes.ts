import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { firstValueFrom } from 'rxjs';

import { QuizTag } from '@/shared/models/quizTags.model';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { QuizzesService } from '@/shared/services/quizzes.service';

register();

interface TagWithQuizzes {
  tag: QuizTag;
  quizzes: Quiz[];
}

@Component({
  selector: 'app-fifty-quizzes-dashboard',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="w-full flex flex-col gap-10 p-6 bg-neutral-50">
      <ng-container *ngFor="let tagGroup of tagsWithQuizzes">
        <!-- Tag header -->
        <div class="text-2xl font-semibold text-gray-800 mb-3">
          {{ tagGroup.tag.name }}
        </div>

        <!-- Horizontal Swiper row -->
        <swiper-container
          slides-per-view="auto"
          space-between="12"
          navigation="true"
          class="w-full !overflow-visible"
        >
          <swiper-slide
            *ngFor="let quiz of tagGroup.quizzes"
            (click)="openQuiz(quiz)"
            class="group flex flex-col items-center justify-start w-[140px] cursor-pointer transition-transform hover:scale-105"
          >
            <div
              class="w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-lg border border-gray-200 group-hover:border-primary"
            >
              <img
                [src]="quiz.imageUrl || '/assets/logos/aussie.png'"
                [alt]="quiz.quizTitle || ('Quiz ' + quiz.quizId)"
                class="w-full h-full object-cover"
              />
            </div>
            <span class="text-sm text-center mt-2 text-gray-700 font-medium line-clamp-2">
              {{ quiz.quizTitle || ('Quiz ' + quiz.quizId) }}
            </span>
          </swiper-slide>
        </swiper-container>
      </ng-container>
    </div>
  `,
})
export class FiftyQuizzesDashboardComponent implements OnInit {
  tagsWithQuizzes: TagWithQuizzes[] = [];

  constructor(
    private quizTagsService: QuizTagsService,
    private quizzesService: QuizzesService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Fetch active tags (sorted by order)
    const allTags = (await firstValueFrom(this.quizTagsService.getAllTags())) || [];

    // Fetch all quizzes
    const allQuizzes = (await firstValueFrom(this.quizzesService.getAllQuizzes())) || [];

    // Build tag-to-quizzes map
    this.tagsWithQuizzes = allTags
      .map(tag => ({
        tag,
        quizzes: allQuizzes.filter(q => tag.quizIds?.includes(q.quizId))
      }))
      .filter(group => group.quizzes.length > 0);
  }

  /** Navigate to the selected quiz */
  openQuiz(quiz: Quiz) {
    this.router.navigate(['/quiz', quiz.quizId]);
  }
}
