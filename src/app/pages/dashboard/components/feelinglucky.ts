import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, firstValueFrom, map, shareReplay } from 'rxjs';

import { Quiz, QuizQuestion } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizDisplayComponent } from '@/pages/common/quiz-display/quiz-display';

@Component({
    selector: 'app-feeling-lucky',
    standalone: true,
    imports: [CommonModule, QuizDisplayComponent],
    template: `
        <div class="flex flex-col gap-6">
            <button
                type="button"
                (click)="roll()"
                [disabled]="loading"
                class="card p-4 sm:p-6 fiftyBorder w-full flex items-center justify-between gap-4 cursor-pointer transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-wait"
                style="background: rgb(40, 40, 40); border-radius: 1rem; text-align: left;"
            >
                <div class="flex items-center gap-4">
                    <div class="flex items-center justify-center rounded-full" style="width: 3rem; height: 3rem; background: rgba(76, 251, 171, 0.15); border: 1px solid var(--fifty-neon-green);">
                        @if (loading) {
                            <i class="pi pi-spin pi-spinner text-2xl" style="color: var(--fifty-neon-green);"></i>
                        } @else {
                            <i class="pi pi-sparkles text-2xl" style="color: var(--fifty-neon-green);"></i>
                        }
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xl font-semibold text-surface-900 dark:text-surface-0">{{ luckyQuiz ? 'Roll again' : "I'm Feeling Lucky" }}</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">20 random questions from a random week — just for fun</span>
                    </div>
                </div>
                <span class="text-xs uppercase font-bold px-3 py-1 rounded-full hidden sm:inline" style="background: rgba(255,255,255,0.08); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);">
                    {{ luckyQuiz ? 'Re-roll' : 'Surprise me' }}
                </span>
            </button>

            @if (errorMessage) {
                <p class="text-sm text-center" style="color: var(--fifty-neon-green);">{{ errorMessage }}</p>
            }

            @if (luckyQuiz) {
                <app-quiz-display [quiz]="luckyQuiz" [previewMode]="true" />
            }
        </div>
    `
})
export class FeelingLuckyComponent implements OnInit {
    luckyQuiz?: Quiz;
    loading = false;
    errorMessage = '';

    private weeklyPool$?: Observable<Quiz[]>;

    constructor(private quizzesService: QuizzesService) {}

    ngOnInit() {
        this.weeklyPool$ = this.quizzesService.getAllQuizzes().pipe(
            map((quizzes) => quizzes.filter((q) => q.quizType === QuizTypeEnum.Weekly && Array.isArray(q.questions) && q.questions.length >= 20)),
            shareReplay(1)
        );
    }

    async roll() {
        if (!this.weeklyPool$ || this.loading) return;

        this.loading = true;
        this.errorMessage = '';

        try {
            const pool = await firstValueFrom(this.weeklyPool$);
            if (!pool.length) {
                this.errorMessage = 'No weekly quizzes available right now.';
                return;
            }

            const source = pool[Math.floor(Math.random() * pool.length)];
            const next = this.buildLuckyQuiz(source);

            this.luckyQuiz = undefined;
            await Promise.resolve();
            this.luckyQuiz = next;
        } catch (err) {
            console.error('Failed to roll lucky quiz', err);
            this.errorMessage = 'Could not roll a quiz. Try again in a sec.';
        } finally {
            this.loading = false;
        }
    }

    private buildLuckyQuiz(source: Quiz): Quiz {
        const shuffled = this.shuffle(source.questions).slice(0, 20);

        return {
            quizId: source.quizId,
            quizTitle: `Lucky 20 — from Quiz #${source.quizId}`,
            quizType: QuizTypeEnum.Weekly,
            questions: shuffled,
            theme: source.theme
        };
    }

    private shuffle(arr: QuizQuestion[]): QuizQuestion[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
}
