// quiz-template.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { QuestionComponent } from '../question/question.component';
import { PreviewService } from '../../shared/services/preview.service';

@Component({
    selector: 'quiz-template',
    standalone: true,
    imports: [CommonModule, QuestionComponent, MatCardModule],
    templateUrl: './quiz-template.component.html',
    styleUrl: './quiz-template.component.css',
})
export class QuizTemplateComponent implements OnInit {
    @Input() questions: any[] = [];
    score = 0;
    totalQuestions = 0;
    answers: { [id: number]: boolean } = {};

    constructor(private previewService: PreviewService) {}

    ngOnInit(): void {
        const fromService = this.previewService.getQuizData();
        if (fromService?.questions) {
            this.questions = fromService.questions.map((q: any, i: number) => ({
                num: i + 1,
                title: q.question,
                answer: q.answer,
            }));
        }

        this.score = 0;
        this.totalQuestions = 0;
    }

    handleAnswer({ id, current }: { id: number; current: boolean }) {
        const prev = this.answers[id];

        if (prev === current) return;

        if (prev === true) this.score--;
        if (current === true) this.score++;

        if (prev === undefined) this.totalQuestions++;

        this.answers[id] = current;
    }
}
