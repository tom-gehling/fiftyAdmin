import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, effect, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EmblaCarouselDirective } from 'embla-carousel-angular';
import type { EmblaOptionsType } from 'embla-carousel';

interface Submission {
    teamName: string;
    userId: string;
    location: string;
    score: number;
    pictureUrl: string;
    submittedAt: string;
}

@Component({
    selector: 'app-submissions-wall-widget',
    standalone: true,
    imports: [CommonModule, RouterModule, EmblaCarouselDirective],
    template: `
        <div class="col-span-12">
            <div class="card gap-2 p-4 rounded-lg shadow-xl flex flex-col overflow-hidden fiftyBorder" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-surface-0 m-0">Submissions Wall</h3>
                    <a routerLink="/fiftyPlus/collabs" class="inline-flex items-center gap-1 text-sm font-medium no-underline hover:opacity-80" style="color: var(--fifty-neon-green);">
                        <span>See all submissions</span>
                        <i class="pi pi-arrow-right text-xs"></i>
                    </a>
                </div>

                <div class="w-full h-[28rem] md:h-[64rem] lg:h-[48rem]">
                    <div class="embla w-full h-full overflow-hidden cursor-grab active:cursor-grabbing" emblaCarousel [options]="emblaOptions">
                        <div class="embla__container flex h-full" [class.flex-col]="emblaOptions.axis === 'y'">
                            @for (sub of submissions; track sub.userId) {
                                <div class="embla__slide shrink-0 grow-0 basis-full flex justify-center w-full h-full px-2">
                                    <div class="flex flex-col bg-surface-100 dark:bg-surface-800 rounded-xl shadow-lg overflow-hidden w-full h-full">
                                        <div class="flex justify-between items-start px-4 py-3 border-b border-gray-200 dark:border-surface-700">
                                            <div class="flex flex-col text-left">
                                                <span class="font-bold text-2xl text-surface-900 dark:text-surface-0 leading-tight">
                                                    {{ sub.teamName }}
                                                </span>
                                                <span class="text-xs text-surface-600 dark:text-surface-300">@{{ sub.userId }}</span>
                                            </div>
                                            <div class="flex flex-col text-right">
                                                <span class="text-xs text-surface-600 dark:text-surface-200">{{ sub.location }}</span>
                                                <span class="text-xs text-surface-600 dark:text-surface-200">{{ sub.submittedAt }}</span>
                                            </div>
                                        </div>

                                        <div class="flex-1 overflow-hidden p-2">
                                            <img [src]="sub.pictureUrl" alt="{{ sub.teamName }}" class="w-full h-auto object-cover rounded-lg aspect-square" />
                                        </div>

                                        <div class="px-4 py-4 border-t border-gray-200 dark:border-surface-700 text-center">
                                            <span class="text-surface-900 dark:text-surface-0 font-bold text-3xl"> {{ sub.score }}/50 </span>
                                        </div>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class SubmissionsWallWidget implements OnInit, OnDestroy {
    submissions: Submission[] = [
        { teamName: 'Saturday Night Slay', userId: 'jizzy_jizzy_gum_drops', location: 'Melbourne', score: 42, pictureUrl: '/assets/submissions/sub1.jpeg', submittedAt: 'Fri 24 Oct, 8:34pm' },
        { teamName: 'Quiz In My Pants', userId: 'jess_the_brain', location: 'Sydney', score: 38, pictureUrl: '/assets/submissions/sub6.jpeg', submittedAt: 'Thurs 23 Oct, 8:36pm' },
        { teamName: 'The Fact Hunts', userId: 'earl_squirrelson', location: 'Brisbane', score: 28, pictureUrl: '/assets/submissions/sub3.jpeg', submittedAt: 'Fri 24 Oct, 8:38pm' },
        { teamName: '35kms', userId: 'nursulltanTulyakby', location: 'Perth', score: 42, pictureUrl: '/assets/submissions/sub7.jpeg', submittedAt: 'Wed 22 Oct, 8:42pm' },
        { teamName: 'Emu Baes', userId: 'emu_baes', location: 'Adelaide', score: 47, pictureUrl: '/assets/submissions/sub5.jpeg', submittedAt: 'Fri 24 Oct, 8:50pm' }
    ];

    emblaOptions: EmblaOptionsType = {
        dragFree: true,
        containScroll: 'trimSnaps',
        axis: this.resolveAxis()
    };

    private emblaRef = viewChild<EmblaCarouselDirective>(EmblaCarouselDirective);
    private resizeHandler = () => this.updateAxis();

    constructor() {
        effect(() => {
            this.emblaRef()?.emblaApi;
        });
    }

    ngOnInit() {
        window.addEventListener('resize', this.resizeHandler);
    }

    ngOnDestroy() {
        window.removeEventListener('resize', this.resizeHandler);
    }

    private resolveAxis(): 'x' | 'y' {
        return typeof window !== 'undefined' && window.innerWidth < 640 ? 'x' : 'y';
    }

    private updateAxis() {
        const axis = this.resolveAxis();
        if (this.emblaOptions.axis === axis) return;
        this.emblaOptions = { ...this.emblaOptions, axis };
        this.emblaRef()?.emblaApi?.reInit(this.emblaOptions);
    }
}
