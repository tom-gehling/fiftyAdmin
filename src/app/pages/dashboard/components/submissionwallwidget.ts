import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

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
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="col-span-12">
      <div class="card gap-2 p-4 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden bg-surface-0 dark:bg-surface-900">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-surface-0">Submissions Wall</h3>

        <div class="w-full h-[28rem] md:h-[64rem] lg:h-[48rem]">
          <swiper-container
            id="submissionsSwiper"
            direction="vertical"
            loop="true"
            freemode="true"
            grab-cursor="true"
            mousewheel="true"
            class="w-full h-full"
          >
            <swiper-slide *ngFor="let sub of submissions" class="flex justify-center w-full px-2">
              <div class="flex flex-col bg-surface-100 dark:bg-surface-800 rounded-xl shadow-lg overflow-hidden w-full h-full">

                <!-- Header -->
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

                <!-- Middle: image -->
                <div class="flex-1 overflow-hidden p-2">
                  <img
                    [src]="sub.pictureUrl"
                    alt="{{ sub.teamName }}"
                    class="w-full h-auto object-cover rounded-lg aspect-square"
                  />
                </div>

                <!-- Footer -->
                <div class="px-4 py-4 border-t border-gray-200 dark:border-surface-700 text-center">
                  <span class="text-surface-900 dark:text-surface-0 font-bold text-3xl">
                    {{ sub.score }}/50
                  </span>
                </div>

              </div>
            </swiper-slide>
          </swiper-container>
        </div>
      </div>
    </div>
  `
})
export class SubmissionsWallWidget implements AfterViewInit {
  submissions: Submission[] = [
    {
      teamName: 'Saturday Night Slay',
      userId: 'quizmaster_tom',
      location: 'Melbourne',
      score: 42,
      pictureUrl: '/assets/submissions/sub1.jpeg',
      submittedAt: 'Sat 21 Sep, 8:34pm'
    },
    {
      teamName: 'Quiz In My Pants',
      userId: 'jess_the_brain',
      location: 'Sydney',
      score: 38,
      pictureUrl: '/assets/submissions/sub6.jpeg',
      submittedAt: 'Sat 21 Sep, 8:36pm'
    },
    {
      teamName: 'The Fact Hunts',
      userId: 'trivia_king',
      location: 'Brisbane',
      score: 28,
      pictureUrl: '/assets/submissions/sub3.jpeg',
      submittedAt: 'Sat 21 Sep, 8:38pm'
    },
    {
      teamName: '35kms',
      userId: 'smartypants',
      location: 'Perth',
      score: 42,
      pictureUrl: '/assets/submissions/sub7.jpeg',
      submittedAt: 'Sat 21 Sep, 8:42pm'
    },
    {
      teamName: 'Emu Baes',
      userId: 'emu_baes',
      location: 'Adelaide',
      score: 47,
      pictureUrl: '/assets/submissions/sub5.jpeg',
      submittedAt: 'Sat 21 Sep, 8:50pm'
    }
  ];

  ngAfterViewInit() {
    this.updateSwiperConfig();
    window.addEventListener('resize', () => this.updateSwiperConfig());
  }

  updateSwiperConfig() {
    const swiperEl = document.getElementById('submissionsSwiper') as any;
    if (!swiperEl) return;

    const width = window.innerWidth;

    // Mobile = horizontal, 1 slide per view
    if (width < 640) {
      swiperEl.setAttribute('slides-per-view', '1');
      swiperEl.setAttribute('direction', 'horizontal');
    }
    // Tablet = vertical, 2 slides
    else if (width < 1024) {
      swiperEl.setAttribute('slides-per-view', '1');
      swiperEl.setAttribute('direction', 'vertical');
    }
    // Desktop = vertical, 2 slides (more space per slide)
    else {
      swiperEl.setAttribute('slides-per-view', '1');
      swiperEl.setAttribute('direction', 'vertical');
    }

    swiperEl.swiper?.update();
  }
}
