import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'question',
  standalone: true,
  imports: [MatExpansionModule, MatButtonModule, CommonModule],
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit{
  @Input() num: number;
  @Input() title: string;
  @Input() answer: string;

  constructor(){
    this.num = 0
    this.title = ''
    this.answer = ''
  }

  ngOnInit(): void {
      
  }

   @Output() answered = new EventEmitter<{ id: number; current: boolean }>();

  currentAnswer: boolean | null = null;

  selectAnswer(value: boolean) {
    if (this.currentAnswer === value) return; // avoid double click on same button

    this.currentAnswer = value;
    this.answered.emit({ id: this.num, current: value });
  }

}
