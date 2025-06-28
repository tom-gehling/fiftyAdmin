import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';

@Component({
    selector: 'app-extract',
    standalone: true,
    imports: [CommonModule, FormsModule, MatCardModule], // <- Required for ngModel
    templateUrl: './extract.component.html',
    styleUrls: ['./extract.component.css'], // <- Use styleUrls (plural)
})
export class ExtractComponent {
    quizNum: string = '';
    inputText: string = '';
    outputText: string = '';
    showOutput: boolean = false;
    downloadUrl: string = '';

    escapeHTML(html: string): string {
        return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    removeEmpty(array: string[], char: string): string[] {
        return array.filter(
            (elem, i) =>
                !(elem === '' || (elem === char && array[i - 1] === ''))
        );
    }

    generateJSON(): void {
        // 👇 Remove this line — no need to escape real HTML
        // const correctedText = this.escapeHTML(this.inputText);
        const lines = this.inputText.split('\n');

        let questions: string[] = [];
        let answers: string[] = [];

        lines.forEach((line) => {
            const parts = line.split('\t');
            questions.push(parts[0]);
            answers.push(parts[1]);
        });

        questions = this.removeEmpty(questions, 'Q').map((q) =>
            q.replace('&#8216', "'")
        );
        answers = this.removeEmpty(answers, 'A').map((a) =>
            a.replace('&#8216', "'")
        );

        const qCount = 50;
        const quizQuestions = questions.map((question, i) => ({
            qNum: (i % qCount) + 1,
            qTitle: question,
            qAnswer: answers[i],
        }));

        const quizObject = {
            quiz_id: this.quizNum,
            questions: quizQuestions,
        };

        this.outputText = JSON.stringify(quizObject, null, 4);
        this.showOutput = true;

        const blob = new Blob([this.outputText], { type: 'application/json' });
        this.downloadUrl = URL.createObjectURL(blob);
    }
}
