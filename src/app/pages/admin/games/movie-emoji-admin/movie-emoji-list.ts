import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-movie-emoji-list',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <div class="flex flex-col gap-4">
      <h2 class="text-2xl font-bold m-0">Movie Emoji Puzzles</h2>
      <p-card>
        <div class="flex flex-col items-center gap-3 py-8 text-center">
          <i class="pi pi-face-smile text-4xl text-surface-300"></i>
          <p class="text-surface-500 m-0">Movie Emoji admin — coming in Phase 2</p>
        </div>
      </p-card>
    </div>
  `
})
export class MovieEmojiListComponent {}
