import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'question',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="border rounded-md p-4 mb-4 shadow-sm hover:shadow-md transition duration-200">
      <!-- Question Header -->
      <div 
        class="flex items-center justify-between cursor-pointer"
        (click)="expanded = !expanded"
      >
        <div class="flex items-center">
          <span
            class="inline-block w-3 h-3 rounded-full mr-2"
            [ngClass]="currentAnswer === null ? 'bg-gray-400' : 'bg-green-500'"
          ></span>
          <span class="font-bold">{{ num }}.</span>
          <span class="ml-2">{{ title }}</span>
        </div>

        <div class="text-gray-500">
          <span *ngIf="!expanded">▼</span>
          <span *ngIf="expanded">▲</span>
        </div>
      </div>

      <!-- Answer Section -->
      <div *ngIf="expanded" class="mt-4">
        <div class="mb-4 text-gray-700">{{ answer }}</div>
        <div class="flex gap-2">
          <button
            pButton
            type="button"
            label="Correct"
            class="p-button-raised p-button-primary"
            [ngClass]="{ 'ring-2 ring-blue-500': currentAnswer === true }"
            (click)="selectAnswer(true)"
          ></button>

          <button
            pButton
            type="button"
            label="Incorrect"
            class="p-button-raised p-button-danger"
            [ngClass]="{ 'ring-2 ring-red-500': currentAnswer === false }"
            (click)="selectAnswer(false)"
          ></button>
        </div>
      </div>
    </div>
  `
})
export class QuestionComponent implements OnInit {
  @Input() num: number = 0;
  @Input() title: string = '';
  @Input() answer: string = '';

  @Output() answered = new EventEmitter<{ id: number; current: boolean }>();

  currentAnswer: boolean | null = null;
  expanded = false;

  constructor() {}

  ngOnInit(): void {}

  selectAnswer(value: boolean) {
    if (this.currentAnswer === value) return;
    this.currentAnswer = value;
    this.answered.emit({ id: this.num, current: value });
  }
}
