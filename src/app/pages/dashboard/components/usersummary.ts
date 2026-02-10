import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@/shared/services/user.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { RecentQuizzesWidget } from './userrecentquizzes';

@Component({
  standalone: true,
  selector: 'app-user-summary-widget',
  imports: [CommonModule, RecentQuizzesWidget],
  template: `
     <div class="card p-6 mb-6 flex flex-col">
      <!-- Top row: Name -->
      <div class="flex items-center mb-2">
        <h2 class="text-2xl font-semibold">{{ greeting }}, {{ displayName || 'Guest User' }}</h2>
      </div>

      <div class="flex justify-center">
        <hr class="w-10/10 border-t" style="border-color: var(--fifty-neon-green);"/>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-lg font-semibold">{{ completedCount }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Quizzes Done</div>
        </div>
        <div>
          <div class="text-lg font-semibold">{{ correctRate | number:'1.0-0' }}%</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Correct Rate</div>
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

      <!-- Streak row -->
      <div class="flex flex-col items-center py-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-bolt text-orange-500 text-2xl"></i>
          <span class="text-3xl font-bold">{{ weeklyStreak }}</span>
        </div>
        <span class="text-sm text-gray-500 dark:text-gray-400 mt-1">week streak</span>
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
  private quizzesService = inject(QuizzesService);

  private readonly greetings = [
    'Hi', 'Hey', 'Howdy', 'Welcome back',
    "G'day", 'Hola', 'What\'s up', 'Good to see you',
    'Hiya', 'Well hello there'
  ];

  greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];
  displayName: string | null = null;
  completedCount = 0;
  correctRate = 0;
  followers = 0;
  following = 0;
  weeklyStreak = 0;

  async ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      if (!user) return;

      // Display name
      this.displayName = user.displayName || user.email?.split('@')[0] || 'User';

      // Fetch user document from Firestore
      const userDoc = await firstValueFrom(this.userService.getUser(user.uid));

      // Followers / Following counts
      this.followers = userDoc?.followersCount ?? 0;
      this.following = userDoc?.followingCount ?? 0;

      // Quiz stats
      const results = await firstValueFrom(this.quizResultsService.getUserResults(user.uid));
      const completed = results.filter(r => r.status === 'completed' && r.score != null);
      this.completedCount = completed.length;

      // Correct rate as percentage (score out of totalQuestions)
      if (completed.length) {
        const totalCorrect = completed.reduce((sum, r) => sum + (r.score ?? 0), 0);
        const totalQuestions = completed.reduce((sum, r) => sum + (r.totalQuestions ?? 0), 0);
        this.correctRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      }

      // Weekly streak calculation
      const allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());
      const weeklyQuizIds = new Set(
        allQuizzes
          .filter(q => q.quizType === QuizTypeEnum.Weekly)
          .map(q => String(q.quizId))
      );

      // Build a set of week timestamps the user completed a weekly quiz
      const completedWeeks = new Set<number>();
      for (const r of completed) {
        if (weeklyQuizIds.has(String(r.quizId)) && r.completedAt) {
          const d = (r.completedAt as any)?.toDate?.() ?? new Date(r.completedAt);
          completedWeeks.add(this.getWeekStart(d).getTime());
        }
      }

      // Walk backwards from current week
      let streak = 0;
      let checkWeek = this.getWeekStart(new Date());
      while (completedWeeks.has(checkWeek.getTime())) {
        streak++;
        checkWeek = new Date(checkWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      this.weeklyStreak = streak;
    });
  }

  /** Get the Monday 00:00 of the week containing the given date */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    return new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  }
}
