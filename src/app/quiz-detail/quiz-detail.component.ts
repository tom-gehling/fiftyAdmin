import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DragDropModule } from '@angular/cdk/drag-drop'; // Import this
import { QuillModule } from 'ngx-quill';
import { MatDialog } from '@angular/material/dialog';
import { QuizTemplateComponent } from '../quiz-template/quiz-template.component'; // adjust path if needed
import { PreviewService } from '../shared/services/preview.service'; // already used

interface Quiz {
    id?: string;
    number: number;
    deploymentDate: string | null;
    deploymentTime: string;
    isPremium: boolean;
    isActive: boolean;
    quizType: number;
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
        MatTabsModule,
        MatSelectModule,
        QuillModule,
        DragDropModule,
    ],
    templateUrl: './quiz-detail.component.html',
    styleUrl: './quiz-detail.component.css',
})
export class QuizDetailComponent implements OnInit {
    @Input() id!: string;
    form!: FormGroup;
    submissionSetupForm: FormGroup;
    imagePreview: string | null = null;
    quizType = [
        { value: 0, viewValue: 'Weekly' },
        { value: 1, viewValue: 'Fifty+' },
        { value: 2, viewValue: 'Collaboration' },
    ];

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered' }, { list: 'bullet' }],
        ],
    };
    activeToolbar: string | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private dialog: MatDialog,
        private previewService: PreviewService
    ) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            number: [0, Validators.required],
            deploymentDate: [null],
            deploymentTime: [null],
            isPremium: [false],
            isActive: [true],
            quizType: [0],
            questionCount: [0, [Validators.required, Validators.min(0)]],
            theme: this.fb.group({
                fontColor: ['#000000'],
                backgroundColor: ['#ffffff'],
                tertiaryColor: ['#cccccc'],
            }),
            questions: this.fb.array([]),
            notesAbove: '',
            notesBelow: '',
            sponsor: '',
        });

        this.form.get('questionCount')?.valueChanges.subscribe((count) => {
            this.setQuestionCount(count);
        });

        if (this.id) {
            this.loadQuiz(this.id);
        }
    }

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    get selectedQuizType() {
        return this.form.get('quizType')?.value;
    }

    setQuestionCount(count: number): void {
        if (count == null || isNaN(count)) return;

        const current = this.questions.length;

        if (count > current) {
            for (let i = current; i < count; i++) {
                this.questions.push(
                    this.fb.group({
                        question: [''],
                        answer: [''],
                    })
                );
            }
        } else if (count < current) {
            for (let i = current - 1; i >= count; i--) {
                this.questions.removeAt(i);
            }
        }
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
            // Call update service
        } else {
            console.log('Creating quiz:', quizData);
            // Call create service
        }

        this.router.navigate(['/quizzes']);
    }

    cancel(): void {
        this.router.navigate(['/quizzes']);
    }

    private loadQuiz(id: string): void {
        // Replace with real loading logic
        const existingQuiz: Quiz = {
            id,
            number: 1,
            deploymentDate: '2025-05-20',
            deploymentTime: '19:00',
            isPremium: true,
            isActive: true,
            quizType: 1,
            questionCount: 50,
            theme: {
                fontColor: '#fbe2df',
                backgroundColor: '#677c73',
                tertiaryColor: '#4cfbab',
            },
            imageUrl: '',
            questions: [
                { question: 'What is 2 + 2?', answer: '4' },
                { question: 'Capital of France?', answer: 'Paris' },
            ],
        };

        this.form.patchValue(existingQuiz);
        this.setQuestionCount(existingQuiz.questionCount);

        // Fill in existing questions
        this.questions.controls.forEach((ctrl, index) => {
            if (existingQuiz.questions[index]) {
                ctrl.patchValue(existingQuiz.questions[index]);
            }
        });

        if (existingQuiz.imageUrl) {
            this.imagePreview = existingQuiz.imageUrl;
        }
    }

    removeQuestion(index: number): void {
        this.questions.removeAt(index);
        this.form.patchValue({
            questionCount: this.questions.length,
        });
    }

    drop(event: CdkDragDrop<FormGroup[]>) {
        const questions = this.questions;
        const questionArray = questions.controls as FormGroup[];
        moveItemInArray(questionArray, event.previousIndex, event.currentIndex);
        questions.setValue(questionArray.map((group) => group.value));
    }

    toggleToolbar(index: number, type: 'question' | 'answer') {
        const key = `${index}-${type}`;
        // If clicked again on the same key, close it
        console.log('Toggle clicked for:', key);
        this.activeToolbar = this.activeToolbar === key ? null : key;
    }

    isToolbarVisible(index: number, type: 'question' | 'answer'): boolean {
        return this.activeToolbar === `${index}-${type}`;
    }

    openPreview() {
        // Save current form state
        const questions = this.form.get('questions')?.value || [];

        // Store it in preview service
        this.previewService.setQuizData({ questions });

        // Open modal with quiz-template
        this.dialog.open(QuizTemplateComponent, {
            width: '90vw',
            maxHeight: '90vh',
            panelClass: 'preview-dialog',
            backdropClass: 'preview-backdrop',
        });
    }
}
