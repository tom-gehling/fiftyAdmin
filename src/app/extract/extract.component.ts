import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
    selector: 'app-extract',
    standalone: true,
    imports: [CommonModule, FormsModule, MatCardModule, MatTabsModule],
    templateUrl: './extract.component.html',
    styleUrl: './extract.component.css',
})
export class ExtractComponent {
    quizNum: string = '';
    inputText: string = '';
    questions: { question: string; answer: string }[] = [];

    constructor(
        public dialogRef: MatDialogRef<ExtractComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private fb: FormBuilder
    ) {
        // Initialize with existing quiz questions
        if (data?.questions) {
            this.questions = [...data.questions];
        }
        if (data?.quizNum) {
            this.quizNum = data.quizNum;
        }
    }

    // Text import
    importTextQuestions(inputText: string): void {
        if (!inputText) return;
        
        const lines = inputText.split('\n');
        this.questions = lines.map((line) => {
            const [question, answer] = line.split('\t');
            return { question: question || '', answer: answer || '' };
        });
        this.dialogRef.close({
            questions: this.questions,
            quizNum: this.quizNum,
        });
    }

    importFromGoogleSheets(sheetId: string): void {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        fetch(url)
            .then((res) => res.text())
            .then((text) => {
                // The response is not pure JSON, need to strip wrapping
                const json = JSON.parse(text.substr(47).slice(0, -2));
                const rows = json.table.rows;

                this.questions = rows.map((r: any) => ({
                    question: r.c[0]?.v || '',
                    answer: r.c[1]?.v || '',
                }));
            })
            .catch((err) => console.error('Error loading Google Sheet:', err));
    }

    // Excel import
    onExcelSelected(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const data = new Uint8Array(reader.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: { question?: string; answer?: string }[] =
                XLSX.utils.sheet_to_json(worksheet);

            this.questions = jsonData.map((row) => ({
                question: row.question || '',
                answer: row.answer || '',
            }));
        };
        reader.readAsArrayBuffer(file);
    }

    // Close and return updated questions
    saveAndClose(): void {
        this.dialogRef.close({
            questions: this.questions,
            quizNum: this.quizNum,
        });
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    get outputText(): string {
        if (!this.questions || !this.questions.length) return '';

        const quizQuestions = this.questions.map((q, i) => ({
            qNum: i + 1,
            qTitle: q.question,
            qAnswer: q.answer,
        }));

        return JSON.stringify(
            { quiz_id: this.quizNum, questions: quizQuestions },
            null,
            4
        );
    }

    get showOutput(): boolean {
        return this.questions && this.questions.length > 0;
    }
}
