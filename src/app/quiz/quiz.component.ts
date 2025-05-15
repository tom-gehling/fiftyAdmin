import { Component, OnInit } from '@angular/core';
import { CommonModule} from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';


@Component({
  selector: 'quiz',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatCardModule,],
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.css']
})
export class QuizComponent implements OnInit{

  quizzes: any = [
    { id: '1', title: 'General Knowledge', createdDate: new Date(), questionCount: 50 },
    { id: '2', title: 'Science Round', createdDate: new Date(), questionCount: 40 },
    // add more
  ];

  displayedColumns = ['title', 'createdDate', 'questionCount'];
  selectedRow: any = null;

  ngOnInit(): void {
      
  }
  constructor(private router: Router) {}

  selectRow(row: any) {
    this.selectedRow = this.selectedRow === row ? null : row;
  }

  goToDetails(row: any) {
    this.router.navigate(['/quizzes', row.id]);
  }
  
}
