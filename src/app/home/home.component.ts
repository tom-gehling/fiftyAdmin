import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';
import { DashboardComponent } from '../dashboard/dashboard.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, MatCardModule, DashboardComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
})
export class HomeComponent {
    userAccessChart: AgChartOptions = {
        title: { text: 'Daily Quiz Access (Last 7 Days)' },
        data: [
            { day: 'Mon', users: 120 },
            { day: 'Tue', users: 150 },
            { day: 'Wed', users: 180 },
            { day: 'Thu', users: 110 },
            { day: 'Fri', users: 200 },
            { day: 'Sat', users: 90 },
            { day: 'Sun', users: 130 },
        ],
        series: [
            {
                type: 'bar',
                xKey: 'day',
                yKey: 'users',
                yName: 'Users',
            },
        ],
    };

    pageViewsChart: AgChartOptions = {
        title: { text: 'Page Views (Last 30 Days)' },
        data: Array.from({ length: 30 }, (_, i) => ({
            date: `Day ${i + 1}`,
            views: Math.floor(Math.random() * 100 + 50),
        })),
        series: [
            {
                type: 'bar',
                xKey: 'date',
                yKey: 'views',
                yName: 'Views',
            },
        ],
    };
}
