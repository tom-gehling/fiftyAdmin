import {
    Component,
    OnInit,
    ViewChild,
    AfterViewInit,
    inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MatTableDataSource } from '@angular/material/table';
import { QuizzesService } from '../shared/services/quizzes.service';
import { Quiz } from '../models/quiz.model';

@Component({
    selector: 'quiz',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatIcon,
        MatTableModule,
        MatCardModule,
        MatSortModule,
        MatPaginatorModule,
        MatFormFieldModule,
        MatInputModule,
    ],
    templateUrl: './quiz.component.html',
    styleUrls: ['./quiz.component.css'],
})
export class QuizComponent implements OnInit, AfterViewInit {
    private quizzesService = inject(QuizzesService);
    displayedColumns: string[] = ['number', 'quizType', 'creationTime'];
    quizTypeLabels = ['Weekly', 'Fifty+', 'Collaboration'];
    dataSource = new MatTableDataSource<Quiz>();
    selectedRow: Quiz | null = null;
    columnFilters: { [key: string]: string } = {};

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(private router: Router) {}

    ngOnInit(): void {
        this.fetchQuizzes();
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;

        this.dataSource.filterPredicate = (data, filter) => {
            let searchTerms: { [key: string]: string } = {};
            try {
                searchTerms = JSON.parse(filter);
            } catch {
                const filterValue = filter.toLowerCase();
                return Object.values(data).some((value) =>
                    String(value).toLowerCase().includes(filterValue)
                );
            }

            return Object.keys(searchTerms).every((key) => {
                const val = String((data as any)[key] || '').toLowerCase();
                return val.includes(searchTerms[key]);
            });
        };
    }

    fetchQuizzes() {
        this.quizzesService.getAllQuizzes().subscribe((quizzes: Quiz[]) => {
            this.dataSource.data = quizzes;
        });
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();
        this.columnFilters = {};
        this.dataSource.filter = filterValue;
    }

    applyColumnFilter(column: string, event: Event) {
        const inputValue = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();
        this.columnFilters[column] = inputValue;
        this.dataSource.filter = JSON.stringify(this.columnFilters);
    }

    selectRow(row: Quiz) {
        this.selectedRow = this.selectedRow === row ? null : row;
    }

    goToDetails(row: Quiz) {
        this.router.navigate(['/quizzes', row.id]);
    }

    create() {
        this.router.navigate(['/quizzes/0']);
    }

    getQuizTypeLabel(type: number): string {
        return this.quizTypeLabels[type] || 'Unknown';
    }
}
