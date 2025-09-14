import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { combineLatest, map, Observable } from 'rxjs';
import { Quiz } from '../models/quiz.model';
import { QuizzesService } from '../shared/services/quizzes.service';
import { AuthService } from '../shared/services/auth.service';
import { register } from 'swiper/element/bundle';
// register Swiper custom elements
register();


@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, MatCardModule, DashboardComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    schemas: [CUSTOM_ELEMENTS_SCHEMA], 
})
export class HomeComponent {

    constructor(
        private quizzesService: QuizzesService,
        private auth: AuthService
    ) {}
    allQuizzes$!: Observable<Quiz[]>;
    fiftyPlusQuizzes$!: Observable<Quiz[]>;
    isMember$!: Observable<boolean>;

    quizLogos: string[] = [
    'quizLogos/2010s.png',
    'quizLogos/2024.png',
    'quizLogos/gravy.png',
    'quizLogos/Hottest20.png',
    'quizLogos/swifty.png',
  ];

  

  ngOnInit() {
    this.isMember$ = this.auth.isMember$;
    this.allQuizzes$ = this.quizzesService.getAllQuizzes();

    this.fiftyPlusQuizzes$ = combineLatest([this.allQuizzes$, this.isMember$]).pipe(
      map(([quizzes, isMember]) =>
        quizzes.filter(q => q.isPremium && isMember)
      )
    );
  }



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
