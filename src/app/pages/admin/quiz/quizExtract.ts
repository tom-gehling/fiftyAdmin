import { Component, Inject, ViewChild } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { QuillModule, QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-extract',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TabsModule, QuillModule],
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <p-card class="w-full h-[90vh] flex flex-col rounded-2xl p-6 overflow-hidden">

        <!-- Header -->
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold">Import Questions</h1>
          <button type="button" pButton class="p-button-outlined p-button-lg" (click)="cancel()">&times;</button>
        </div>

        <!-- Tabs -->
        <p-tabs [(value)]="selectedTab" class="flex-1 flex flex-col overflow-visible">
          <p-tablist>
            <p-tab value="0">Plain Text</p-tab>
            <p-tab value="1">Excel</p-tab>
            <p-tab value="2">Google Sheets</p-tab>
          </p-tablist>

          <p-tabpanels class="flex-1 flex flex-col overflow-visible">
            <!-- Plain Text Tab -->
            <p-tabpanel value="0" class="flex flex-col gap-4 h-full overflow-visible">
              <h4 class="text-lg font-semibold">Paste Questions and Answers</h4>
              <div class="quill-wrapper border border-gray-300 dark:border-gray-600 rounded-md p-1 overflow-visible relative">
                <quill-editor
                  #quillEditor
                  [(ngModel)]="inputText"
                  [modules]="quillModules"
                  theme="bubble"
                  style="width: 100%; height: 300px"
                  placeholder="Paste questions and answers here (Question[TAB]Answer)"
                ></quill-editor>
              </div>
              <button
                pButton
                type="button"
                label="Import"
                class="p-button-raised w-fit"
                (click)="importTextQuestions()"
              ></button>
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
  `,
  styles: [`
    /* Allow Quill bubble toolbar to appear above dialog */
    .ql-bubble {
      z-index: 999999 !important;
    }
    .ql-container, .quill-wrapper, .p-card, .p-tabview-panels, .p-tabview-panel, .p-dialog-content {
      overflow: visible !important;
    }
    .quill-wrapper {
      position: relative;
    }
  `]
})
export class QuizExtractComponent {
  @ViewChild('quillEditor') quillEditor!: QuillEditorComponent;

  selectedTab = '0';
  quizNum: string = '';
  inputText: string = '';
  questions: { question: string; answer: string }[] = [];
  googleSheetId: string = '';
  googleTabName: string = 'Sheet1';

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
    ],
  };

  constructor(
    public ref: DynamicDialogRef,
    @Inject(DynamicDialogConfig) public config: any
  ) {
    if (config?.data?.questions) this.questions = [...config.data.questions];
    if (config?.data?.quizNum) this.quizNum = config.data.quizNum;
  }

  private convertPipesToList(html: string): string {
  if (!html.includes('|')) return html;
  const items = html.split('|').map(item => item.trim()).filter(Boolean);
  if (!items.length) return html;
  return `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
}

importTextQuestions(): void {
  if (!this.quillEditor?.quillEditor) return;

  const quill = this.quillEditor.quillEditor;
  const htmlContent = quill.root.innerHTML;

  const tempEl = document.createElement('div');
  tempEl.innerHTML = htmlContent;

  const rows: { question: string; answer: string }[] = [];

  // Look for table rows
  tempEl.querySelectorAll('tr').forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length >= 2) {
      let questionHtml = this.stripInlineStyles(tds[0].innerHTML);
      let answerHtml = this.stripInlineStyles(tds[1].innerHTML);

      questionHtml = this.convertPipesToList(questionHtml);
      answerHtml = this.convertPipesToList(answerHtml);

      rows.push({ question: questionHtml, answer: answerHtml });
    }
  });

  // Fallback: if no table, split by <p> or <div>
  if (!rows.length) {
    tempEl.childNodes.forEach(node => {
      if (node instanceof Element && (node.tagName === 'DIV' || node.tagName === 'P') && node.innerHTML.trim()) {
        let [q, a] = node.innerHTML.split('\t').map(html => this.stripInlineStyles(html));

        q = this.convertPipesToList(q);
        a = this.convertPipesToList(a);

        rows.push({ question: q || '', answer: a || '' });
      }
    });
  }

  this.questions = rows;
  this.saveAndClose();
}


  private stripInlineStyles(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove all style attributes
    temp.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));

    return temp.innerHTML.trim();
  }

  /**
   * Import questions from Excel file
   */
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
