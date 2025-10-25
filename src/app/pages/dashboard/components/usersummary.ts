import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@/shared/services/user.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { MembershipService } from '@/shared/services/membership.service';
import { RecentQuizzesWidget } from './userrecentquizzes';

@Component({
  standalone: true,
  selector: 'app-user-summary-widget',
  imports: [CommonModule, RecentQuizzesWidget],
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
        <div class="flex flex-col items-end">
          <div class="text-sm text-gray-500 dark:text-gray-400">
          Joined: {{ joinedAt ? (joinedAt | date: 'mediumDate') : '—' }}
        </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ membershipType }} Member
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Logins: {{ loginCount }}
        </div>
        
      </div>
        
      </div>

      <div class="flex justify-center">
        <hr class="w-10/10 border-t" style="border-color: var(--fifty-neon-green);"/>
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
      <div class="flex justify-center">
        <hr class="w-10/10 border-t" style="border-color: var(--fifty-neon-green);"/>
      </div>
       <!-- Insert Recent Quizzes Widget -->
      <app-recent-quizzes-widget></app-recent-quizzes-widget>
    </div>
  `
})
export class UserSummaryWidget implements OnInit {
  private auth = inject(Auth);
  private userService = inject(UserService);
  private quizResultsService = inject(QuizResultsService);
  private membershipService = inject(MembershipService);

  displayName: string | null = null;
  joinedAt: Date | null = null;
  completedCount = 0;
  averageScore = 0;
  followers = 0;
  following = 0;
  membershipType: string = '';
  loginCount: number = 0;

  async ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      if (!user) return;

      // Display name
      this.displayName = user.displayName || user.email?.split('@')[0] || 'User';

      this.membershipService.membership$.subscribe(tier => {
        this.membershipType = tier;
      });

      // Fetch user document from Firestore
      const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
      this.joinedAt = (userDoc?.createdAt as any)?.toDate?.() ?? new Date();

      // Followers / Following counts
      this.followers = userDoc?.followersCount ?? 0;
      this.following = userDoc?.followingCount ?? 0;

      this.loginCount = userDoc?.loginCount ?? 0;


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
