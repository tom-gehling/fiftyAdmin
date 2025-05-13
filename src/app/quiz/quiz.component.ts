import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor} from '@angular/common';
import { QuestionComponent } from '../question/question.component';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'quiz',
  imports: [NgFor, QuestionComponent, MatCardModule],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit {
  questions = [
    {num: 1, title: 'Test', answer: 'Answer'},
    {num: 2, title: 'Test2', answer: 'Answer'},
    {num: 3, title: 'Test3', answer: 'Answer'}
  ]

  score = 0;
  totalQuestions = 0;
  answers: { [id: number]: boolean } = {}; // stores questionId → answer

  ngOnInit(): void {
    this.score = 0;
    this.totalQuestions = 0;
  }

  handleAnswer({ id, current }: { id: number; current: boolean }) {
    const prev = this.answers[id];

    if (prev === current) 
      return; // no change

    // Adjust score if changing answer
    if (prev === true) 
      this.score--;       // undo previous correct
    if (current === true) 
      this.score++;    // apply new correct

    // Set the answer and update tally if first time
    if (prev === undefined) 
      this.totalQuestions++;

    this.answers[id] = current;
  }
}
