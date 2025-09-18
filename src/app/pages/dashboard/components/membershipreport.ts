import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';

@Component({
    standalone: true,
    selector: 'app-membership-report-widget',
    imports: [ChartModule],
    template: `
    <div class="card mb-8">
        <div class="font-semibold text-xl mb-4">Fifty+ Membership Sign Ups (Last 6 Months)</div>
        <p-chart type="bar" [data]="chartData" [options]="chartOptions" class="h-100" />
    </div>
    `
})
export class MembershipReportWidget implements OnInit, OnDestroy {
    chartData: any;
    chartOptions: any;
    subscription!: Subscription;

    constructor(public layoutService: LayoutService) {
        this.subscription = this.layoutService.configUpdate$.pipe(debounceTime(25))
            .subscribe(() => this.initChart());
    }

    ngOnInit() {
        this.initChart();
    }

    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');

        // Generate last 6 months labels dynamically
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        }

        // Example dummy data (replace with real numbers from API/service)
        const new3MonthMembers = [28, 23, 19, 41, 25, 50];
        const newYearlyMembers = [30, 32, 35, 41, 34, 29];

        this.chartData = {
            labels: months,
            datasets: [
                {
                    type: 'bar',
                    label: 'New 3-Month Members',
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-300'),
                    data: new3MonthMembers,
                    barThickness: 32
                },
                {
                    type: 'bar',
                    label: 'New Yearly Members',
                    backgroundColor: documentStyle.getPropertyValue('--p-primary-200'),
                    data: newYearlyMembers,
                    barThickness: 32,
                    borderRadius: {
                        topLeft: 8,
                        topRight: 8,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    borderSkipped: false
                }
            ]
        };

        this.chartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    labels: { color: textColor }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textMutedColor },
                    grid: { color: 'transparent', borderColor: 'transparent' }
                },
                y: {
                    stacked: true,
                    ticks: { color: textMutedColor },
                    grid: { color: borderColor, borderColor: 'transparent', drawTicks: false }
                }
            }
        };
    }

    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}
