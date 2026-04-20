import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EmblaCarouselDirective } from 'embla-carousel-angular';
import type { EmblaOptionsType } from 'embla-carousel';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { QuizTag } from '@/shared/models/quizTags.model';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

interface TagWithQuizzes {
    tag: QuizTag;
    quizzes: Quiz[];
}

@Component({
    selector: 'app-fifty-quizzes-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, EmblaCarouselDirective],
    template: `
        @if (tagsWithQuizzes.length) {
            <div class="card w-full flex flex-col gap-6 p-4 sm:p-6 mb-8 fiftyBorder" style="padding-left:0px !important; padding-right:0px !important; background: rgb(40, 40, 40); border-radius: 1rem;">
                <div class="flex flex-wrap gap-2 px-6">
                    <a
                        routerLink="/fiftyPlus/archives"
                        class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                        style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                    >
                        <i class="pi pi-book text-xs"></i>
                        <span>Archives</span>
                    </a>
                    <a
                        routerLink="/fiftyPlus/exclusives"
                        class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                        style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                    >
                        <i class="pi pi-star text-xs"></i>
                        <span>Exclusives</span>
                    </a>
                    <a
                        routerLink="/fiftyPlus/collabs"
                        class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                        style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                    >
                        <i class="pi pi-users text-xs"></i>
                        <span>Collabs</span>
                    </a>
                    <a
                        routerLink="/fiftyPlus/questionQuizzes"
                        class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                        style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                    >
                        <i class="pi pi-list text-xs"></i>
                        <span>Question Quizzes</span>
                    </a>
                </div>
                @for (tagGroup of tagsWithQuizzes; track tagGroup.tag.name) {
                    <div class="flex flex-col gap-2">
                        <div class="text-2xl font-semibold text-surface-900 dark:text-surface-0 pl-6 pr-3">
                            {{ tagGroup.tag.name }}
                        </div>

                        <div class="embla w-full overflow-hidden py-6 cursor-grab active:cursor-grabbing" emblaCarousel [options]="emblaOptions">
                            <div class="embla__container flex">
                                @for (quiz of tagGroup.quizzes; track quiz.quizId) {
                                    <div (click)="openQuiz(quiz)" class="embla__slide shrink-0 grow-0 basis-[42%] sm:basis-1/3 xl:basis-1/4 group flex flex-col items-center justify-start cursor-pointer transition-transform hover:scale-120 p-2 pl-3">
                                        <div class="w-full sm:w-[140px] aspect-square sm:h-[140px] rounded-2xl overflow-hidden shadow-lg" style="border: 3px solid #4cfbab; background-color: #000000">
                                            <img [src]="quiz.imageUrl || '/assets/logos/fiftyplus.png'" [alt]="quiz.quizTitle || 'Quiz ' + quiz.quizId" class="w-full h-full object-contain" />
                                        </div>
                                        <span class="text-sm text-center mt-2 font-medium line-clamp-2">
                                            {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
                                        </span>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                }
            </div>
        } @else {
            <p class="text-gray-500 text-center mt-10">No quizzes found.</p>
        }
    `
})
export class FiftyQuizzesDashboardComponent implements OnInit {
    tagsWithQuizzes: TagWithQuizzes[] = [];

    emblaOptions: EmblaOptionsType = {
        dragFree: true,
        align: 'start',
        containScroll: 'trimSnaps'
    };

    constructor(
        private quizTagsService: QuizTagsService,
        private quizzesService: QuizzesService,
        private router: Router
    ) {}

    ngOnInit() {
        combineLatest([this.quizTagsService.getAllTags(), this.quizzesService.getAllQuizzes()])
            .pipe(
                map(([tags, quizzes]) =>
                    tags
                        .map((tag) => ({
                            tag,
                            quizzes: quizzes.filter((q) => tag.quizIds?.includes(q.quizId))
                        }))
                        .filter((group) => group.quizzes.length > 0)
                )
            )
            .subscribe((result) => {
                this.tagsWithQuizzes = result;
            });
    }

    openQuiz(quiz: Quiz) {
        let baseRoute = '/fiftyPlus/archives';
        switch (quiz.quizType) {
            case QuizTypeEnum.FiftyPlus:
                baseRoute = '/fiftyPlus/exclusives';
                break;
            case QuizTypeEnum.Collab:
                baseRoute = '/fiftyPlus/collabs';
                break;
            case QuizTypeEnum.QuestionType:
                baseRoute = '/fiftyPlus/questionQuizzes';
                break;
        }
        this.router.navigate([`${baseRoute}/${quiz.quizId}`]);
    }
}
