import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { QuizTag } from '@/shared/models/quizTags.model';
import { register } from 'swiper/element/bundle';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

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
    <div class="w-full flex flex-col gap-8 p-4">
      <ng-container *ngFor="let tagGroup of tagsWithQuizzes">
        <!-- Tag Header -->
        <div class="text-xl font-semibold text-gray-800 mb-2">{{ tagGroup.tag.name }}</div>

        <!-- Horizontal Swiper -->
        <swiper-container
          slides-per-view="auto"
          space-between="4"
          navigation="true"
          class="w-full"
        >
          <swiper-slide
            *ngFor="let quiz of tagGroup.quizzes"
            class="flex flex-col items-center justify-center w-[120px] p-2"
          >
            <div class="w-[100px] h-[100px] rounded-lg overflow-hidden shadow-md border border-gray-200">
              <img
                [src]="quiz.imageUrl || '/assets/logos/aussie.png'"
                alt="{{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}"
                class="w-full h-full object-cover"
              />
            </div>
            <span class="text-sm text-center mt-2 text-gray-700">
              {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
            </span>
          </swiper-slide>
        </swiper-container>
      </ng-container>
    </div>
  `,
})
export class FiftyQuizzesDashboardComponent implements OnInit {
  // Correct type here
  tagsWithQuizzes: TagWithQuizzes[] = [];

  constructor(
    private quizTagsService: QuizTagsService,
    private quizzesService: QuizzesService
  ) {}

  async ngOnInit() {
    // Load all tags
    const allTags: QuizTag[] = await firstValueFrom(this.quizTagsService.getAllTags()) || [];

    // Load all quizzes
    const allQuizzes: Quiz[] = await firstValueFrom(this.quizzesService.getAllQuizzes()) || [];

    // Map tags to quizzes using tag.quizIds
    this.tagsWithQuizzes = allTags
      .map(tag => ({
        tag,
        quizzes: allQuizzes.filter(q => tag.quizIds?.includes(q.quizId))
      }))
      .filter(t => t.quizzes.length > 0);

    console.log(this.tagsWithQuizzes);
  }
}
