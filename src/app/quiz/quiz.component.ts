import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MatTableDataSource } from '@angular/material/table';

@Component({
    selector: 'quiz',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
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
    displayedColumns = ['title', 'createdDate', 'questionCount'];
    dataSource = new MatTableDataSource<any>();

    selectedRow: any = null;
    columnFilters: { [key: string]: string } = {};

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    quizzes = [
        {
            id: '1',
            title: 'Quiz 1',
            createdDate: new Date(),
            questionCount: 50,
        },
        {
            id: '2',
            title: 'Quiz 2',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '3',
            title: 'Quiz 3',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '4',
            title: 'Quiz 4',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '5',
            title: 'Quiz 5',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '6',
            title: 'Quiz 6',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '7',
            title: 'Quiz 7',
            createdDate: new Date(),
            questionCount: 40,
        },
        {
            id: '8',
            title: 'Quiz 8',
            createdDate: new Date(),
            questionCount: 40,
        },
        // add more
    ];

    ngOnInit(): void {
        this.dataSource.data = this.quizzes;
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;

        this.dataSource.filterPredicate = (data, filter) => {
            let searchTerms = {};
            try {
                searchTerms = JSON.parse(filter);
            } catch {
                const filterValue = filter.toLowerCase();
                return Object.values(data).some((value) =>
                    String(value).toLowerCase().includes(filterValue)
                );
            }
            return Object.keys(searchTerms).every((key) => {
                const val = String(data[key] || '').toLowerCase();
                return val.includes((searchTerms as any)[key]);
            });
        };
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();
        this.columnFilters = {}; // clear column filters when using global filter
        this.dataSource.filter = filterValue;
    }

    applyColumnFilter(column: string, event: Event) {
        const inputValue = (event.target as HTMLInputElement).value
            .trim()
            .toLowerCase();
        this.columnFilters[column] = inputValue;
        this.dataSource.filter = JSON.stringify(this.columnFilters);
    }

    selectRow(row: any) {
        this.selectedRow = this.selectedRow === row ? null : row;
    }

    goToDetails(row: any) {
        this.router.navigate(['/quizzes', row.id]);
    }

    constructor(private router: Router) {}
}
