import { Component, Inject } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-extract',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TabsModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <p-card class="w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl p-6 overflow-hidden">

        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">Import Questions</h1>
          <button type="button" pButton class="p-button-outlined p-button-lg" (click)="cancel()">&times;</button>
        </div>

        <!-- Tabs -->
        <p-tabs [(value)]="selectedTab" class="flex-1 flex flex-col overflow-hidden">
          <p-tablist>
            <!-- [ ]: set default selection to plain text -->
            <p-tab value="0">Plain Text</p-tab>
            <p-tab value="1">Excel</p-tab>
            <p-tab value="2">Google Sheets</p-tab>
          </p-tablist>

          <p-tabpanels class="flex-1 flex flex-col overflow-hidden">
            <!-- Plain Text Tab -->
            <p-tabpanel value="0" class="flex flex-col gap-4 h-full overflow-y-auto">
              <h4 class="text-lg font-semibold">Paste Questions and Answers</h4>
              <!-- [ ]: make extracts quill editors to preserve formatting -->
              <textarea
                rows="10"
                [(ngModel)]="inputText"
                placeholder="Question[TAB]Answer"
                class="w-full p-3 rounded-xl border border-gray-300 resize-y"
              ></textarea>
              <button pButton type="button" label="Import" class="p-button-raised w-fit" (click)="importTextQuestions(inputText)"></button>
            </p-tabpanel>

            <!-- Excel Tab -->
            <p-tabpanel value="1" class="flex flex-col gap-4 h-full overflow-y-auto">
              <h4 class="text-lg font-semibold">Import from Excel</h4>
              <input
                type="file"
                accept=".xlsx,.xls"
                (change)="onExcelSelected($event)"
                class="border border-gray-300 rounded-xl p-2"
              />
            </p-tabpanel>

            <!-- Google Sheets Tab -->
            <p-tabpanel value="2" class="flex flex-col gap-4 h-full overflow-y-auto">
              <h4 class="text-lg font-semibold">Extract from Google Sheets</h4>
              <h4 class="text-gray-500">COMING SOON</h4>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

      </p-card>
    </div>
  `
})
export class QuizExtractComponent {
  selectedTab = 0;
  quizNum: string = '';
  inputText: string = '';
  questions: { question: string; answer: string }[] = [];
  googleSheetId: string = '';
  googleTabName: string = 'Sheet1';

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: any
  ) {
    if (config?.data?.questions) this.questions = [...config.data.questions];
    if (config?.data?.quizNum) this.quizNum = config.data.quizNum;
  }

  importTextQuestions(inputText: string): void {
    if (!inputText) return;

    const lines = inputText.split('\n');
    this.questions = lines.map(line => {
      const [question, answer] = line.split('\t');
      return { question: question || '', answer: answer || '' };
    });
    this.saveAndClose();
  }

  onExcelSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const data = new Uint8Array(reader.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: { question?: string; answer?: string }[] = XLSX.utils.sheet_to_json(worksheet);

      this.questions = jsonData.map(row => ({
        question: row.question || '',
        answer: row.answer || '',
      }));
    };
    reader.readAsArrayBuffer(file);
  }

  saveAndClose(): void {
    this.ref.close({ questions: this.questions, quizNum: this.quizNum });
  }

  cancel(): void {
    this.ref.close(null);
  }

  get outputText(): string {
    if (!this.questions?.length) return '';
    return JSON.stringify({
      quiz_id: this.quizNum,
      questions: this.questions.map((q, i) => ({
        qNum: i + 1,
        qTitle: q.question,
        qAnswer: q.answer
      }))
    }, null, 4);
  }

  get showOutput(): boolean {
    return this.questions?.length > 0;
  }
}
