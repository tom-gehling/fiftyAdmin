import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
@Component({
  selector: 'question',
  imports: [MatExpansionModule],
  templateUrl: './question.component.html',
  styleUrl: './question.component.css'
})
export class QuestionComponent implements OnInit{
  @Input() num: number;
  @Input() title: string;
  @Input() answer: string;

  answerVisible: boolean = false;

  ngOnInit(): void {
      
  }

  toggleAnswer(){
    this.answerVisible = !this.answerVisible;
  }

}
