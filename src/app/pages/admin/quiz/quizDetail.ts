import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { serverTimestamp } from 'firebase/firestore';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SpeedDialModule } from 'primeng/speeddial';

// Angular CDK Drag & Drop
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { DynamicDialogModule, DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { QuizExtractComponent } from './quizExtract';
import { DatePickerModule } from 'primeng/datepicker';
import { QuizTagsService } from '@/shared/services/quizTags.service';
import { QuizTag } from '@/shared/models/quizTags.model';
import { NotifyService } from '@/shared/services/notify.service';
import { firstValueFrom } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { MenuModule } from 'primeng/menu';
import { OverlayModule } from 'primeng/overlay';

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
    DynamicDialogModule,
    MultiSelectModule,
    ToastModule,
    ProgressSpinnerModule,
    FloatLabelModule,
    FormsModule,
    SpeedDialModule,
    TextareaModule
  ],
  templateUrl: './quizDetail.html'
})
export class QuizDetailComponent implements OnInit {
  id!: string;
  quiz!: Quiz;
  form!: FormGroup;
  quizImagePreview: string | null = null;
  availableTags: QuizTag[] = [];
  selectedTags: QuizTag[] = [];
  tabSelected: string = '0';
  QuizTypeEnum = QuizTypeEnum;
  saving: boolean = false;

  // NEW: Holds the SpeedDial menu for each question
  questionMenus: MenuItem[][] = [];

  quizType = [
    { value: QuizTypeEnum.Weekly, viewValue: 'Weekly' },
    { value: QuizTypeEnum.FiftyPlus, viewValue: 'Fifty+' },
    { value: QuizTypeEnum.Collab, viewValue: 'Collaboration' },
    { value: QuizTypeEnum.QuestionType, viewValue: 'Question-Type' }
  ];

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  };

  logos: string[] = [
    '2010s-clear-1.png','aussie.png','boomer.png','chrissy.png','EURO.png',
    'footy.png','HOTTEST-20 (1).png','logo.png','loser.png','Movie.png',
    'movie2.png','olympic.png','peoples.png','reality.png','SA.png',
    'spooky.png','swifty (1).png','weekly-hundred.png','Yearl-2023.png',
    'yearly-22022.png','yeswequiz.png'
  ];

  private removedQuestionsBackup: any[] = [];
  logoDialogVisible: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private quizzesService: QuizzesService,
    private authService: AuthService,
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private quizTagService: QuizTagsService,
    private notify: NotifyService
  ) {}

  ngOnInit(): void {
    // Load tags
    this.quizTagService.getAllTags().subscribe(tags => {
      this.availableTags = tags;
    });

    // Load quiz
    this.route.paramMap.subscribe(async params => {
      this.id = params.get('id') || '0';
      if (this.id && this.id !== '0') {
        await this.loadQuiz(this.id);
      } else {
        await this.initializeEmptyQuiz();
      }
    });
  }

  private async initializeEmptyQuiz(): Promise<void> {
    const emptyQuestions = Array.from({ length: 50 }, (_, i) => ({
      questionId: i + 1,
      question: '',
      answer: '',
      category: '',
      timeless: false,
    }));

    const nextQuizId = await this.quizzesService.getNextQuizId(QuizTypeEnum.Weekly);
    this.quiz = {
      quizId: nextQuizId,
      isPremium: false,
      isActive: true,
      quizType: QuizTypeEnum.Weekly,
      questions: emptyQuestions,
      theme: {
        fontColor: '#fbe2df',
        backgroundColor: '#677c73',
        tertiaryColor: '#4cfbab',
      },
    };
    this.buildForm(this.quiz);
  }

  private buildForm(quiz: Quiz): void {
    let deploymentDate: Date | null = null;
    if (quiz.deploymentDate) {
      const ts = quiz.deploymentDate;
      if (ts instanceof Date) deploymentDate = ts;
      else if ('toDate' in ts && typeof ts.toDate === 'function') deploymentDate = ts.toDate();
      else deploymentDate = new Date(ts as any);
    }

    this.form = this.fb.group({
      quizId: [quiz.quizId || null],
      quizTitle: [quiz.quizTitle || ''],
      quizType: [quiz.quizType || 0],
      isActive: [quiz.isActive ?? true],
      isPremium: [quiz.isPremium || false],
      questionCount: [quiz.questions?.length || 50],
      deploymentDate: [deploymentDate],
      theme: this.fb.group({
        fontColor: [quiz.theme?.fontColor || '#fbe2df'],
        backgroundColor: [quiz.theme?.backgroundColor || '#677c73'],
        tertiaryColor: [quiz.theme?.tertiaryColor || '#4cfbab'],
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

    // Sync SpeedDial menus initially
    this.syncQuestionMenus();

    this.form.get('quizType')?.valueChanges.subscribe(async (newType: QuizTypeEnum) => {
      // if (!this.id || this.id === '0') { // only for new quizzes
        const nextId = await this.quizzesService.getNextQuizId(newType);
        this.form.get('quizId')?.setValue(nextId);
      // }

      if (newType !== QuizTypeEnum.Collab) this.tabSelected = '0';
    });

    this.form.get('questionCount')?.valueChanges.subscribe((count) => {
      this.setQuestionCount(count);
      this.syncQuestionMenus();
    });
  }

  get questions(): FormArray {
    return this.form.get('questions') as FormArray;
  }

  private syncQuestionMenus(): void {
    const count = this.questions.length;
    this.questionMenus = Array.from({ length: count }, (_, i) => this.createQuestionMenu(i));
  }

  private createQuestionMenu(index: number): MenuItem[] {
    return [
      { icon: 'pi pi-pencil', command: () => this.notify.info('Commenting on Quiz Coming Soon!') },
      { icon: 'pi pi-flag', command: () => this.toggleFlag(index) }
    ];
  }

  setQuestionCount(count: number): void {
    if (count == null || isNaN(count)) return;
    const current = this.questions.length;

    if (count > current) {
      const toRestore = this.removedQuestionsBackup.splice(0, count - current);
      toRestore.forEach(q => this.questions.push(this.fb.group(q)));
      for (let i = this.questions.length; i < count; i++) {
        this.questions.push(this.fb.group({
          questionId: [i + 1],
          question: [''],
          answer: [''],
          category: [''],
          timeless: [false],
        }));
      }
    } else if (count < current) {
      this.removedQuestionsBackup = this.questions.controls
        .slice(count)
        .map(c => c.value)
        .concat(this.removedQuestionsBackup);
      for (let i = current - 1; i >= count; i--) this.questions.removeAt(i);
    }

    this.questions.controls.forEach((q, i) => q.get('questionId')?.setValue(i + 1));
  }

  drop(event: CdkDragDrop<FormGroup[]>): void {
    moveItemInArray(this.questions.controls as FormGroup[], event.previousIndex, event.currentIndex);
  }

  normalizeHtml(html: string): string {
    if (!html) return '';
    return html.replace(/&nbsp;/g, ' ').replace(/<p>\s*<\/p>/g, '').replace(/<p>\s*(.*?)\s*<\/p>/g, '<p>$1</p>');
  }

  async saveQuiz(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;

    try {
      const formValue = this.form.value;
      formValue.questions.forEach((q: any) => {
        q.question = this.normalizeHtml(q.question);
        q.answer = this.normalizeHtml(q.answer);
      });

      if (!formValue.deploymentDate) formValue.deploymentDate = serverTimestamp();
      else if (!(formValue.deploymentDate instanceof Date)) formValue.deploymentDate = new Date(formValue.deploymentDate);

      if (formValue.quizTypeId == QuizTypeEnum.Weekly){
        this.quiz.quizTitle = String(formValue.quizId);
      } 

      const quizData: Quiz = { ...this.quiz, ...formValue };

      if (this.id && this.id !== '0') {
        await this.quizzesService.updateQuiz(this.id, quizData);
      } else {
        const currentUserId = this.authService.currentUserId;
        this.id = await this.quizzesService.createQuiz(quizData, currentUserId);
      }

      this.notify.success('Quiz saved successfully');
      this.router.navigate(['/members/admin/quizzes']);
    } catch (error) {
      console.error('Error saving quiz:', error);
      this.notify.error('Error saving quiz');
    } finally {
      this.saving = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/members/admin/quizzes']);
  }

  private async loadQuiz(id: string): Promise<void> {
    const quiz = await firstValueFrom(this.quizzesService.getQuizById(id));
    this.ngZone.run(async () => {
      if (!quiz) await this.initializeEmptyQuiz();
      else {
        this.quiz = quiz;
        this.buildForm(this.quiz);
      }
    });
  }

  openImportDialog(): void {
    const ref: DynamicDialogRef = this.dialogService.open(QuizExtractComponent, {
      header: 'Import Questions',
      width: '50%',
      modal: true,
      dismissableMask: true,
      contentStyle: { 'max-height': '80vh', overflow: 'auto' },
      data: { questions: this.questions.value, quizNum: this.form.get('quizId')?.value }
    });

    ref.onClose.subscribe((result: { questions: any[], quizNum: string } | null) => {
      if (result) {
        this.questions.clear();
        result.questions.forEach(q => this.questions.push(this.fb.group({
          questionId: [q.questionId || null],
          question: [q.question || ''],
          answer: [q.answer || ''],
          category: [q.category || ''],
          timeless: [q.timeless || false]
        })));
        this.form.patchValue({ quizId: result.quizNum, questionCount: result.questions.length });
        this.syncQuestionMenus();
      }
    });
  }

  toggleFlag(index: number): void {
    const control = this.questions.at(index);
    control.get('timeless')?.setValue(!control.get('timeless')?.value);
  }

  showLogoDialog(): void { this.logoDialogVisible = true; }
  selectLogoFromDialog(logo: string): void { this.form.get('imageUrl')?.setValue(logo); this.logoDialogVisible = false; }
}
