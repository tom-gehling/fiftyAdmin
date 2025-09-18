import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule],
    template: `
    <!-- Active Weekly Quiz -->
    <div class="col-span-12 lg:col-span-12 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div>
                <span class="block text-muted-color font-medium mb-2">Active Weekly Quiz</span>
                <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ activeQuiz?.title || 'N/A' }}</div>
            </div>
            <div class="mt-4 text-muted-color text-sm">
                Deployment: {{ activeQuiz?.deploymentDate | date:'mediumDate' }}
            </div>
        </div>
    </div>

    <!-- Weekly Quiz Page Views -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Weekly Quiz Page Views</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ pageViews }}</div>
                </div>
                <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-globe text-cyan-500 text-xl!"></i>
                </div>
            </div>
            <div class="mt-4 text-muted-color text-sm">
                    Last 30 days
                </div>
        </div>
    </div>

    <!-- Member Count -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Fifty+ Member Count</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ memberCount }}</div>
                </div>
                <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-users text-cyan-500 text-xl!"></i>
                </div>
            </div>
            <div class="mt-4">
                <span class="text-primary font-medium">{{ memberIncrease }}%</span>
                <span class="text-muted-color"> since last week</span>
            </div>
        </div>
    </div>

    <!-- Weekly Submissions -->
    <div class="col-span-12 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Submissions This Week</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ weeklySubmissions }}</div>
                </div>
                <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-file text-purple-500 text-xl!"></i>
                </div>
            </div>
        </div>
    </div>
    `
})
export class StatsWidget {
    activeQuiz: { title: string; deploymentDate: string } | null = { title: '#169', deploymentDate: '2025-09-15' };
    pageViews = 57632;
    memberCount = 2340;
    memberIncrease = 12;
    weeklySubmissions = 188;
}
