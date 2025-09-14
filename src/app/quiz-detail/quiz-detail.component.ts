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
import { QuizTemplateComponent } from '../common/quiz-template/quiz-template.component';
import { PreviewService } from '../shared/services/preview.service';
import { QuizzesService } from '../shared/services/quizzes.service';
import { Quiz } from '../models/quiz.model';
import { AuthService } from '../shared/services/auth.service';
import { ExtractComponent } from '../extract/extract.component';

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
        QuillModule,
        DragDropModule,
    ],
    templateUrl: './quiz-detail.component.html',
    styleUrls: ['./quiz-detail.component.css'],
})
export class QuizDetailComponent implements OnInit {
    @Input() id!: string;

    quiz!: Quiz;
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
    actionBarVisible = false;
    quizImagePreview: string | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private dialog: MatDialog,
        private previewService: PreviewService,
        private quizzesService: QuizzesService,
        private authService: AuthService,
        private ngZone: NgZone
    ) {}

    ngOnInit(): void {
        if (this.id && this.id !== '0') {
            this.loadQuiz(this.id);
        } else {
            let emptyQuestions = Array.from({ length: 50 }, (_, i) => ({
                questionId: i + 1,
                question: '',
                answer: '',
                category: '',
                timeless: false,
            }));
            // new quiz
            this.quiz = {
                quizId: Date.now(), // unique numeric ID
                quizNumber: 0,
                isPremium: false,
                isActive: true,
                quizType: 0,
                questions: emptyQuestions,
                theme: {
                    fontColor: '#000000',
                    backgroundColor: '#ffffff',
                    tertiaryColor: '#cccccc',
                },
            };
            this.buildForm(this.quiz);
        }
    }

    private normalizeHtml(html: string): string {
        if (!html) return '';
        let cleaned = html.replace(/&nbsp;/g, ' ');       // replace non-breaking spaces
        cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');    // remove empty <p> tags
        cleaned = cleaned.replace(/<p>\s*(.*?)\s*<\/p>/g, '<p>$1</p>'); // trim spaces inside <p>
        return cleaned;
    }

    private buildForm(quiz: Quiz): void {
        this.form = this.fb.group({
            quizId: [quiz.quizId],
            quizNumber: [quiz.quizNumber, Validators.required],
            deploymentDate: [quiz.deploymentDate || null],
            deploymentTime: [quiz.deploymentTime || null],
            isPremium: [quiz.isPremium || false],
            isActive: [quiz.isActive ?? true],
            quizType: [quiz.quizType || 0],
            questionCount: [quiz.questions?.length || 50],
            theme: this.fb.group({
                fontColor: [quiz.theme?.fontColor || '#000000'],
                backgroundColor: [quiz.theme?.backgroundColor || '#ffffff'],
                tertiaryColor: [quiz.theme?.tertiaryColor || '#cccccc'],
            }),
            questions: this.fb.array(
                (quiz.questions || []).map((q) =>
                    this.fb.group({
                        questionId: [q.questionId],
                        question: [q.question],
                        answer: [q.answer],
                        category: [q.category || ''],
                        timeless: [q.timeless || false],
                    })
                )
            ),
            notesAbove: [quiz.notesAbove || ''],
            notesBelow: [quiz.notesBelow || ''],
            imageUrl: ['']
        });

        // keep question count synced
        this.form.get('questionCount')?.valueChanges.subscribe((count) => {
            this.setQuestionCount(count);
        });
    }

    get questions(): FormArray {
        return this.form.get('questions') as FormArray;
    }

    setQuestionCount(count: number): void {
        if (count == null || isNaN(count)) return;
        const current = this.questions.length;

        if (count > current) {
            for (let i = current; i < count; i++) {
                this.questions.push(
                    this.fb.group({
                        questionId: [i + 1],
                        question: [''],
                        answer: [''],
                        category: [''],
                        timeless: [false],
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

        const formValue = this.form.value;

        // normalize HTML for all questions
        formValue.questions.forEach((q: any) => {
            q.question = this.normalizeHtml(q.question);
            q.answer = this.normalizeHtml(q.answer);
        });

        // keep date as Date
        let deploymentDate: Date | null = formValue.deploymentDate || null;

        // convert time object/string to "HH:mm"
        let deploymentTime: string | null = null;
        if (formValue.deploymentTime instanceof Date) {
            const hours = formValue.deploymentTime
                .getHours()
                .toString()
                .padStart(2, '0');
            const minutes = formValue.deploymentTime
                .getMinutes()
                .toString()
                .padStart(2, '0');
            deploymentTime = `${hours}:${minutes}`;
        } else if (typeof formValue.deploymentTime === 'string') {
            deploymentTime = formValue.deploymentTime; // already "HH:mm"
        }

        const quizData: Quiz = {
            ...this.quiz,
            ...formValue,
            deploymentDate,
            deploymentTime,
        };

        try {
            if (this.id && this.id !== '0') {
                await this.quizzesService.updateQuiz(this.id, quizData);
                console.log('Quiz updated');
            } else {
                const newId = await this.quizzesService.createQuiz(quizData);
                console.log('Quiz created with ID:', newId);
                this.id = newId;
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
                    console.warn('Quiz not found, starting new.');
                    this.quiz = {
                        quizId: Date.now(),
                        quizNumber: 0,
                        isPremium: false,
                        isActive: true,
                        quizType: 0,
                        questions: [],
                        theme: {
                            fontColor: '#000000',
                            backgroundColor: '#ffffff',
                            tertiaryColor: '#cccccc',
                        },
                    };
                } else {
                    this.quiz = quiz;
                }
                this.buildForm(this.quiz);
            });
        });
    }

    removeQuestion(index: number): void {
        this.questions.removeAt(index);
        this.form.patchValue({ questionCount: this.questions.length });
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

    toggleActionBar() {
    this.actionBarVisible = !this.actionBarVisible;
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

    // canWrite() {
    //     return this.authService.user$.value && !this.authService.isAnonymous;
    // }

    openImportDialog(): void {
        const dialogRef = this.dialog.open(ExtractComponent, {
            height: '80vh',
            width: '80vw',
            data: {
                quizNum: this.form.get('quizNumber')?.value,
                questions: this.questions.value,
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result?.questions) {
                this.questions.clear();
                result.questions.forEach((q: any, idx: number) => {
                    this.questions.push(
                        this.fb.group({
                            questionId: [idx + 1],
                            question: q.question,
                            answer: q.answer,
                            category: q.category || '',
                            timeless: q.timeless || false,
                        })
                    );
                });
                this.form.patchValue({ questionCount: this.questions.length });
            }
        });
    }

    onQuestionChanged(event: any, index: number) {
        const html = event.html || '';
        this.questions.at(index).get('question')?.setValue(this.normalizeHtml(html), { emitEvent: false });
    }

    onAnswerChanged(event: any, index: number) {
        const html = event.html || '';
        this.questions.at(index).get('answer')?.setValue(this.normalizeHtml(html), { emitEvent: false });
    }

    onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];

  // Preview the image
  const reader = new FileReader();
  reader.onload = () => {
    this.quizImagePreview = reader.result as string;
    // Optionally, set the form control value for now (Base64 preview)
    this.form.get('quizImage')?.setValue(this.quizImagePreview);
  };
  reader.readAsDataURL(file);
//   to do -  set up firebase storage to save images
}
}
