import { Component, OnInit, Input, NgZone } from '@angular/core';
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
import { DragDropModule } from '@angular/cdk/drag-drop';
import { QuillModule } from 'ngx-quill';
import { MatDialog } from '@angular/material/dialog';
import { QuizTemplateComponent } from '../quiz-template/quiz-template.component';
import { PreviewService } from '../shared/services/preview.service';
import { QuizzesService } from '../shared/services/quizzes.service'; // <-- Import your Firestore service
import { Quiz, QuizQuestion } from '../models/quiz.model'; // Make sure this path is correct
import { AuthService } from '../shared/services/auth.service';

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
        MatTimepickerModule,
        MatNativeDateModule,
        MatTabsModule,
        MatSelectModule,
        QuillModule, // <-- Required for <quill-editor>
        DragDropModule,
    ],
    templateUrl: './quiz-detail.component.html',
    styleUrls: ['./quiz-detail.component.css'],
})
export class QuizDetailComponent implements OnInit {
    @Input() id!: string;
    form!: FormGroup;
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
        private previewService: PreviewService,
        private quizzesService: QuizzesService, // Inject service
        private authService: AuthService,
        private ngZone: NgZone
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
            notesAbove: [''],
            notesBelow: [''],
            sponsor: [''],
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

    async saveQuiz(): Promise<void> {
        if (this.form.invalid) return;

        const quizData: Quiz = this.form.value;

        try {
            if (this.id && this.id != '0') {
                await this.quizzesService.updateQuiz(this.id, quizData);
                console.log('Quiz updated');
            } else {
                const newId = await this.quizzesService.createQuiz(quizData);
                console.log('Quiz created with ID:', newId);
                this.id = newId; // Assign new id after create
            }
            this.router.navigate(['/quizzes']);
        } catch (error) {
            console.error('Error saving quiz:', error);
        }
    }

    cancel(): void {
        this.router.navigate(['/quizzes']);
    }

    private loadQuiz(id: string): void {
        this.quizzesService.getQuizById(id).subscribe((quiz) => {
            this.ngZone.run(() => {
                if (!quiz) {
                    console.warn('Quiz not found. Initializing blank quiz.');
                    this.form.reset({
                        number: 0,
                        deploymentDate: null,
                        deploymentTime: null,
                        isPremium: false,
                        isActive: true,
                        quizType: 0,
                        questionCount: 0,
                        theme: {
                            fontColor: '#000000',
                            backgroundColor: '#ffffff',
                            tertiaryColor: '#cccccc',
                        },
                        questions: [],
                        notesAbove: '',
                        notesBelow: '',
                        sponsor: '',
                    });
                    this.setQuestionCount(50); // Clears question form array
                    this.imagePreview = null;
                    return;
                }

                this.form.patchValue(quiz);
                this.setQuestionCount(quiz.questions.length);
                this.questions.controls.forEach((ctrl, idx) => {
                    ctrl.patchValue(quiz.questions[idx]);
                });
            });
        });
    }

    removeQuestion(index: number): void {
        this.questions.removeAt(index);
        this.form.patchValue({
            questionCount: this.questions.length,
        });
    }

    drop(event: CdkDragDrop<FormGroup[]>): void {
        const questions = this.questions;
        const questionArray = questions.controls as FormGroup[];
        moveItemInArray(questionArray, event.previousIndex, event.currentIndex);
        questions.setValue(questionArray.map((group) => group.value));
    }

    toggleToolbar(index: number, type: 'question' | 'answer'): void {
        const key = `${index}-${type}`;
        this.activeToolbar = this.activeToolbar === key ? null : key;
    }

    isToolbarVisible(index: number, type: 'question' | 'answer'): boolean {
        return this.activeToolbar === `${index}-${type}`;
    }

    openPreview(): void {
        const questions = this.form.get('questions')?.value || [];
        this.previewService.setQuizData({ questions });

        this.dialog.open(QuizTemplateComponent, {
            width: '90vw',
            maxHeight: '90vh',
            panelClass: 'preview-dialog',
            backdropClass: 'preview-backdrop',
        });
    }

    canWrite() {
        return this.authService.user$.value && !this.authService.isAnonymous;
    }
}
