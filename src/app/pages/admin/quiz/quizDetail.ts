import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ColorPickerModule } from 'primeng/colorpicker';

// Angular CDK Drag & Drop
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { DynamicDialogModule, DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { QuizExtractComponent } from './quizExtract';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'quiz-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    QuillModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    TabsModule,
    DialogModule,
    DragDropModule,
    SelectModule,
    ColorPickerModule,
    DatePickerModule,
    DynamicDialogModule
  ],
  templateUrl: './quizDetail.html'
})
export class QuizDetailComponent implements OnInit {
  id!: string;
  quiz!: Quiz;
  form!: FormGroup;
  quizImagePreview: string | null = null;

  tabSelected: string = '0'; // default tab
  QuizTypeEnum = QuizTypeEnum;

  quizType = [
    { value: QuizTypeEnum.Weekly, viewValue: 'Weekly' },
    { value: QuizTypeEnum.FiftyPlus, viewValue: 'Fifty+' },
    { value: QuizTypeEnum.Collab, viewValue: 'Collaboration' },
  ];

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private quizzesService: QuizzesService,
    private authService: AuthService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') || '0';
      if (this.id && this.id !== '0') {
        this.loadQuiz(this.id);
      } else {
        this.initializeEmptyQuiz();
      }
    });
  }

  private initializeEmptyQuiz(): void {
    const emptyQuestions = Array.from({ length: 50 }, (_, i) => ({
      questionId: i + 1,
      question: '',
      answer: '',
      category: '',
      timeless: false,
    }));

    this.quiz = {
      quizId: Date.now(),
      isPremium: false,
      isActive: true,
      quizType: QuizTypeEnum.Weekly,
      questions: emptyQuestions,
      theme: {
        fontColor: '#000000',
        backgroundColor: '#ffffff',
        tertiaryColor: '#cccccc',
      },
    };
    this.buildForm(this.quiz);
  }

  private buildForm(quiz: Quiz): void {
    this.form = this.fb.group({
      quizId: [quiz.quizId || null],
      quizTitle: [quiz.quizTitle || ''],
      quizType: [quiz.quizType || 0],
      isActive: [quiz.isActive ?? true],
      isPremium: [quiz.isPremium || false],
      questionCount: [quiz.questions?.length || 50],
      deploymentDate: [quiz.deploymentDate || null], // <-- Date & time
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
      imageUrl: [''],
    });

    // Reset tab if not Collaboration
    this.form.get('quizType')?.valueChanges.subscribe((type) => {
      if (type !== QuizTypeEnum.Collab) {
        this.tabSelected = '0';
      }
    });

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

  drop(event: CdkDragDrop<FormGroup[]>): void {
    const questionArray = this.questions.controls as FormGroup[];
    moveItemInArray(questionArray, event.previousIndex, event.currentIndex);
  }

  normalizeHtml(html: string): string {
    if (!html) return '';
    let cleaned = html.replace(/&nbsp;/g, ' ');
    cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
    cleaned = cleaned.replace(/<p>\s*(.*?)\s*<\/p>/g, '<p>$1</p>');
    return cleaned;
  }

  async saveQuiz(): Promise<void> {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    // Normalize question & answer
    formValue.questions.forEach((q: any) => {
      q.question = this.normalizeHtml(q.question);
      q.answer = this.normalizeHtml(q.answer);
    });

    // Handle deploymentDate & deploymentTime
    const deployment: Date | null = formValue.deploymentDate;
    if (deployment) {
      formValue.deploymentDate = deployment;
      formValue.deploymentTime = deployment.toTimeString().slice(0,5); // HH:MM
    } else {
      formValue.deploymentDate = null;
      formValue.deploymentTime = null;
    }

    const quizData: Quiz = { ...this.quiz, ...formValue };

    try {
      if (this.id && this.id !== '0') {
        await this.quizzesService.updateQuiz(this.id, quizData);
      } else {
        this.id = await this.quizzesService.createQuiz(quizData);
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
          this.initializeEmptyQuiz();
        } else {
          this.quiz = quiz;
          this.buildForm(this.quiz);
        }
      });
    });
  }

  openImportDialog(): void {
    const ref: DynamicDialogRef = this.dialogService.open(QuizExtractComponent, {
      header: 'Import Questions',
      width: '50%',
      modal: true,
      dismissableMask: true,
      contentStyle: { 'max-height': '80vh', overflow: 'auto' },
      data: {
        questions: this.questions.value,
        quizNum: this.form.get('quizId')?.value
      }
    });

    ref.onClose.subscribe((result: { questions: any[], quizNum: string } | null) => {
      if (result) {
        this.questions.clear();
        result.questions.forEach(q => {
          this.questions.push(this.fb.group({
            questionId: [q.questionId || null],
            question: [q.question || ''],
            answer: [q.answer || ''],
            category: [q.category || ''],
            timeless: [q.timeless || false]
          }));
        });
        this.form.patchValue({ quizId: result.quizNum, questionCount: result.questions.length });
      }
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.quizImagePreview = reader.result as string;
      this.form.get('quizImage')?.setValue(this.quizImagePreview);
    };
    reader.readAsDataURL(file);
  }
}
