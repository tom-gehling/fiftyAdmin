import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { QuizTag } from '@/shared/models/quizTags.model';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

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
    <div class="card w-full flex flex-col gap-10 p-6 bg-surface-0 dark:bg-surface-900 mb-8 fiftyBorder" *ngIf="tagsWithQuizzes.length">
      <ng-container *ngFor="let tagGroup of tagsWithQuizzes">
        <div class="text-2xl font-semibold text-surface-900 dark:text-surface-0 ">
          {{ tagGroup.tag.name }}
        </div>

        <swiper-container
  loop="true"
  grab-cursor="true"
  mousewheel="true"
  freemode="true"
  space-between="12"
  class="w-full !overflow-visible"
  [breakpoints]="{
    '0': { slidesPerView: 2 },
    '640': { slidesPerView: 3 },
    '1024': { slidesPerView: 3 },
    '1280': { slidesPerView: 'auto' }
  }"
>
  <swiper-slide
    *ngFor="let quiz of tagGroup.quizzes"
    (click)="openQuiz(quiz)"
    class="group flex flex-col items-center justify-start w-[140px] cursor-pointer transition-transform hover:scale-120 m-4"
  >
    <div
      class="w-[140px] h-[140px] rounded-2xl overflow-hidden shadow-lg "
    >
      <img
        [src]=" quiz.imageUrl ? ('/assets/logos/'+quiz.imageUrl) : '/assets/logos/aussie.png'"
        [alt]="quiz.quizTitle || ('Quiz ' + quiz.quizId)"
        class="w-full h-full object-cover"
      />
    </div>
    <span class="text-sm text-center mt-2 text-surface-900 dark:text-surface-0 font-medium line-clamp-2">
      {{ quiz.quizTitle || ('Quiz ' + quiz.quizId) }}
    </span>
  </swiper-slide>
</swiper-container>

      </ng-container>
    </div>
    <p *ngIf="!tagsWithQuizzes.length" class="text-gray-500 text-center mt-10">No quizzes found.</p>
  `,
})
export class FiftyQuizzesDashboardComponent implements OnInit {
  tagsWithQuizzes: TagWithQuizzes[] = [];

  constructor(
    private quizTagsService: QuizTagsService,
    private quizzesService: QuizzesService,
    private router: Router
  ) {}

  ngOnInit() {
    combineLatest([
      this.quizTagsService.getAllTags(),
      this.quizzesService.getAllQuizzes()
    ])
    .pipe(
      map(([tags, quizzes]) =>
        tags
          .map(tag => ({
            tag,
            quizzes: quizzes.filter(q => tag.quizIds?.includes(q.quizId))
          }))
          .filter(group => group.quizzes.length > 0)
      )
    )
    .subscribe(result => {
      this.tagsWithQuizzes = result;
    });
  }

  openQuiz(quiz: Quiz) {
    let baseRoute = '/members/archives';
    switch (quiz.quizType) {
      case QuizTypeEnum.FiftyPlus: baseRoute = '/members/exclusives'; break;
      case QuizTypeEnum.Collab: baseRoute = '/members/collabs'; break;
      case QuizTypeEnum.QuestionType: baseRoute = '/members/questionQuizzes'; break;
    }
    this.router.navigate([`${baseRoute}/${quiz.quizId}`]);
  }
}
