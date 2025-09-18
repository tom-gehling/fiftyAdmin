import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { register } from 'swiper/element/bundle';
register();

interface Submission {
  teamName: string;
  score: number;
  pictureUrl: string;
}

@Component({
  selector: 'app-submissions-wall-widget',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
  template: `
    <div class="col-span-12">
      <div class="card p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Submissions Wall</h3>

        <swiper-container
          direction="vertical"
          slides-per-view="3"
          loop="true"
          mousewheel="true"
          class="h-[400px]"
        >
          <swiper-slide *ngFor="let sub of submissions">
            <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg shadow p-4">
              <div class="flex flex-col gap-1">
                <span class="font-bold text-gray-900 dark:text-gray-100">{{ sub.teamName }}</span>
                <span class="text-gray-600 dark:text-gray-300 text-sm">Score: {{ sub.score }}/50</span>
              </div>
              <img
                [src]="sub.pictureUrl"
                alt="{{ sub.teamName }}"
                class="w-20 h-20 object-cover rounded-lg"
              />
            </div>
          </swiper-slide>
        </swiper-container>
      </div>
    </div>
  `
})
export class SubmissionsWallWidget {
  submissions: Submission[] = [
    { teamName: 'Saturday Night Slay', score: 42, pictureUrl: '/assets/submissions/sub1.jpeg' },
    { teamName: 'Quiz In My Pants', score: 38, pictureUrl: '/assets/submissions/sub6.jpeg' },
    { teamName: 'The Fact Hunts', score: 28, pictureUrl: '/assets/submissions/sub3.jpeg' },
    { teamName: '35kms', score: 42, pictureUrl: '/assets/submissions/sub7.jpeg' },
    { teamName: 'Emu Baes', score: 47, pictureUrl: '/assets/submissions/sub5.jpeg' }
  ];
}
