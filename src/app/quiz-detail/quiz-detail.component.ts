import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { QuillModule } from 'ngx-quill';
// This is a placeholder for actual quiz fetching/updating logic
interface Quiz {
    id?: string;
    number: number;
    deploymentTime: string;
    isPremium: boolean;
    isActive: boolean;
    questionCount: number;
    theme: {
        fontColor: string;
        backgroundColor: string;
        tertiaryColor: string;
    };
    imageUrl?: string;
    questions: { question: string; answer: string }[];
}

@Component({
    selector: 'quiz-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTimepickerModule,
        QuillModule,
    ],
    templateUrl: './quiz-detail.component.html',
    styleUrl: './quiz-detail.component.css',
})
export class QuizDetailComponent implements OnInit {
    @Input() id!: string;
    form!: FormGroup;
    imagePreview: string | null = null;
    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'], // toggled buttons
            [{ list: 'ordered' }, { list: 'bullet' }], // ordered and bullet lists
        ],
    };

    constructor(private fb: FormBuilder) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            number: [0, Validators.required],
            deploymentDate: [null],
            deploymentTime: [null],
            isPremium: [false],
            isActive: [true],
            questionCount: [0, Validators.required],
            theme: this.fb.group({
                fontColor: ['#000000'],
                backgroundColor: ['#ffffff'],
                tertiaryColor: ['#cccccc'],
            }),
            questions: this.fb.array([]),
        });

        if (this.id) {
            this.loadQuiz(this.id);
        }

        this.form.get('questionCount')?.valueChanges.subscribe((count) => {
            this.setQuestionCount(count);
        });
    }

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    setQuestionCount(count: number): void {
        const current = this.questions.length;

        if (count > current) {
            for (let i = current; i < count; i++) this.addQuestion();
        } else {
            for (let i = current - 1; i >= count; i--) this.removeQuestion(i);
        }
    }

    addQuestion(): void {
        const questionGroup = this.fb.group({
            question: ['', Validators.required],
            answer: ['', Validators.required],
        });
        this.questions.push(questionGroup);
    }

    removeQuestion(index: number): void {
        this.questions.removeAt(index);
        this.form.patchValue({
            questionCount: this.questions.length,
        });
    }

    onImageSelected(event: Event): void {
        const file = (event.target as HTMLInputElement)?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    saveQuiz(): void {
        if (this.form.invalid) return;

        const quizData: Quiz = this.form.value;
        quizData.imageUrl = this.imagePreview || undefined;

        if (this.id) {
            console.log('Updating quiz:', quizData);
            // Call update logic here
        } else {
            console.log('Creating quiz:', quizData);
            // Call create logic here
        }
    }

    private loadQuiz(id: string): void {
        const existingQuiz: Quiz = {
            id,
            number: 1,
            deploymentTime: '2025-05-20T19:00',
            isPremium: true,
            isActive: true,
            questionCount: 2,
            theme: {
                fontColor: '#ff0000',
                backgroundColor: '#f0f0f0',
                tertiaryColor: '#00ff00',
            },
            imageUrl: '',
            questions: [
                { question: 'What is 2 + 2?', answer: '4' },
                { question: 'Capital of France?', answer: 'Paris' },
            ],
        };

        this.form.patchValue(existingQuiz);
        existingQuiz.questions.forEach((q) => {
            const qGroup = this.fb.group({
                question: [q.question, Validators.required],
                answer: [q.answer, Validators.required],
            });
            this.questions.push(qGroup);
        });

        if (existingQuiz.imageUrl) {
            this.imagePreview = existingQuiz.imageUrl;
        }
    }
}
