import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@/shared/services/user.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';

@Component({
  standalone: true,
  selector: 'app-user-summary-widget',
  imports: [CommonModule],
  template: `
     <div class="card p-6 mb-6 flex flex-col">
      <!-- Top row: Name on left, Joined on right -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3">
          <!-- User icon with subtle circle -->
          <span class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xl">
            <i class="pi pi-user"></i>
          </span>
          <h2 class="text-2xl font-semibold">{{ displayName || 'Guest User' }}</h2>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Joined: {{ joinedAt ? (joinedAt | date: 'mediumDate') : '—' }}
        </p>
      </div>

      <div class="flex justify-center">
        <hr class="w-10/10 border-t border-gray-400 dark:border-gray-600" />
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-lg font-semibold">{{ completedCount }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Quizzes Completed</div>
        </div>
        <div>
          <div class="text-lg font-semibold">{{ averageScore | number:'1.0-1' }}/50</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Avg Score</div>
        </div>
        <div>
          <div class="text-lg font-semibold">{{ followers }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Followers</div>
        </div>
        <div>
          <div class="text-lg font-semibold">{{ following }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Following</div>
        </div>
      </div>

      <!-- [ ]: add stats versus all users-->
    </div>
  `
})
export class UserSummaryWidget implements OnInit {
  private auth = inject(Auth);
  private userService = inject(UserService);
  private quizResultsService = inject(QuizResultsService);

  displayName: string | null = null;
  joinedAt: Date | null = null;
  completedCount = 0;
  averageScore = 0;
  followers = 0;
  following = 0;

  async ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      if (!user) return;

      // Display name
      this.displayName = user.displayName || user.email?.split('@')[0] || 'User';

      // Fetch user document from Firestore
      const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
      this.joinedAt = (userDoc?.createdAt as any)?.toDate?.() ?? new Date();

      // Followers / Following counts
      this.followers = userDoc?.followersCount ?? 0;
      this.following = userDoc?.followingCount ?? 0;

      // Quiz stats
      const results = await firstValueFrom(this.quizResultsService.getUserResults(user.uid));
      const completed = results.filter(r => r.status === 'completed' && r.score != null);
      this.completedCount = completed.length;
      this.averageScore = completed.length
        ? completed.reduce((sum, r) => sum + (r.score ?? 0), 0) / completed.length
        : 0;
    });
  }
}
