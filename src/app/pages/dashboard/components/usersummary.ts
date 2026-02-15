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
    'Hi', 'Hey', 'Welcome back',
    "G'day", 'Good to see you',
    'Hiya', 'Bonjour', 'Hola',             
    'Ciao', 'Olá',    
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
      const completed = results.filter(r => r.status === 'completed' && r.score != null && !r.retro);
      this.completedCount = completed.length;

      // Correct rate as percentage (score out of totalQuestions)
      if (completed.length) {
        const totalCorrect = completed.reduce((sum, r) => sum + (r.score ?? 0), 0);
        const totalQuestions = completed.reduce((sum, r) => sum + (r.totalQuestions ?? 0), 0);
        this.correctRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
      }

      // Weekly streak calculation
      const allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());
      const weeklyQuizzes = allQuizzes
        .filter(q => q.quizType === QuizTypeEnum.Weekly && q.deploymentDate)
        .map(q => {
          const date = q.deploymentDate instanceof Date
            ? q.deploymentDate
            : (q.deploymentDate as any).toDate();
          return {
            quizId: String(q.quizId),
            deploymentDate: date,
          };
        })
        .sort((a, b) => b.deploymentDate.getTime() - a.deploymentDate.getTime());

      if (weeklyQuizzes.length === 0) {
        this.weeklyStreak = 0;
        return;
      }

      // Get current active quiz (most recent deployed quiz)
      const now = new Date();
      const currentActiveQuiz = weeklyQuizzes.find(q => q.deploymentDate <= now);

      if (!currentActiveQuiz) {
        this.weeklyStreak = 0;
        return;
      }

      // Build a map of quiz completions: quizId -> completion date
      const completionMap = new Map<string, Date>();
      for (const r of completed) {
        if (r.completedAt) {
          const d = (r.completedAt as any)?.toDate?.() ?? new Date(r.completedAt);
          completionMap.set(String(r.quizId), d);
        }
      }

      // Walk backwards from current active quiz, counting consecutive weeks
      let streak = 0;
      for (let i = 0; i < weeklyQuizzes.length; i++) {
        const quiz = weeklyQuizzes[i];

        // Stop if we've gone past the current active quiz (future quizzes)
        if (quiz.deploymentDate > now) continue;

        const completionDate = completionMap.get(quiz.quizId);
        const isCurrentQuiz = quiz.quizId === currentActiveQuiz.quizId;

        // Find when this quiz's window closes (when the next quiz deploys)
        const nextQuiz = weeklyQuizzes[i - 1]; // Previous index = next chronologically
        const hasNextQuizDeployed = nextQuiz && nextQuiz.deploymentDate <= now;

        if (!completionDate) {
          // User didn't complete this quiz
          if (isCurrentQuiz && !hasNextQuizDeployed) {
            // Current quiz and next quiz hasn't deployed yet - user still has time
            streak++;
            continue;
          } else {
            // Missed this quiz, streak breaks
            break;
          }
        }

        // Quiz was completed - check it wasn't completed retroactively
        // Only count if completed on or after deployment date
        if (completionDate >= quiz.deploymentDate) {
          // For previous quizzes, ideally check it was completed before next quiz
          // but we'll be lenient and count it as long as it was completed
          streak++;
        } else {
          // Completed before deployment (shouldn't happen)
          break;
        }
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
