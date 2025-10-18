import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

interface Submission {
  teamName: string;
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
      <div class="card p-4 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
        <h3 class="text-xl font-bold mb-4 text-gray-900">Submissions Wall</h3>

        <div class="w-full h-[64rem] md:h-[48rem] sm:h-[32rem]">
          <swiper-container
            id="submissionsSwiper"
            direction="vertical"
            loop="true"
            class="w-full h-full"
          >
            <swiper-slide *ngFor="let sub of submissions" class="flex justify-center w-full px-2">
              <div class="flex flex-col bg-gray-50 rounded-xl shadow-lg overflow-hidden w-full h-full">

                <!-- Header -->
                <div class="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                  <div class="flex flex-col">
                    <span class="font-bold text-lg text-gray-900">{{ sub.teamName }}</span>
                    <span class="text-xs text-gray-500">{{ sub.location }}</span>
                  </div>
                  <span class="text-xs text-gray-500">{{ sub.submittedAt }}</span>
                </div>

                <!-- Middle: image with padding -->
                <div class="flex-1 overflow-hidden px-2 pt-2 pb-2">
                  <img
                    [src]="sub.pictureUrl"
                    alt="{{ sub.teamName }}"
                    class="w-full h-full object-cover rounded-lg"
                  />
                </div>

                <!-- Footer -->
                <div class="px-4 py-2 border-t border-gray-200 text-center">
                  <span class="text-gray-900 font-medium">Score: {{ sub.score }}/50</span>
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
    { teamName: 'Saturday Night Slay', location: 'Melbourne', score: 42, pictureUrl: '/assets/submissions/sub1.jpeg', submittedAt: 'Sat 21 Sep, 8:34pm' },
    { teamName: 'Quiz In My Pants', location: 'Sydney', score: 38, pictureUrl: '/assets/submissions/sub6.jpeg', submittedAt: 'Sat 21 Sep, 8:36pm' },
    { teamName: 'The Fact Hunts', location: 'Brisbane', score: 28, pictureUrl: '/assets/submissions/sub3.jpeg', submittedAt: 'Sat 21 Sep, 8:38pm' },
    { teamName: '35kms', location: 'Perth', score: 42, pictureUrl: '/assets/submissions/sub7.jpeg', submittedAt: 'Sat 21 Sep, 8:42pm' },
    { teamName: 'Emu Baes', location: 'Adelaide', score: 47, pictureUrl: '/assets/submissions/sub5.jpeg', submittedAt: 'Sat 21 Sep, 8:50pm' }
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
      swiperEl.setAttribute('slides-per-view', '2');
      swiperEl.setAttribute('direction', 'vertical');
    }
    // Desktop = vertical, 3 slides
    else {
      swiperEl.setAttribute('slides-per-view', '2');
      swiperEl.setAttribute('direction', 'vertical');
    }

    // Refresh swiper after changing attributes
    swiperEl.swiper?.update();
  }
}
