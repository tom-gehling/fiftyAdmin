import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { Quiz } from '../models/quiz.model';

@Injectable({
  providedIn: 'root'
})
export class QuizPdfService {

  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 20;
  private readonly CONTENT_WIDTH = 170; // PAGE_WIDTH - 2 * MARGIN

  /**
   * Generate and download a PDF for a quiz
   */
  downloadQuizPdf(quiz: Quiz): void {
    const doc = new jsPDF();
    let y = this.MARGIN;

    // Get theme colors or defaults (green/pink theme)
    const bgColor = this.hexToRgb(quiz.theme?.backgroundColor || '#677c73');
    const fontColor = this.hexToRgb(quiz.theme?.fontColor || '#fbe2df');
    const accentColor = this.hexToRgb(quiz.theme?.tertiaryColor || '#4cfbab');

    // Draw background for title area
    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    doc.rect(0, 0, this.PAGE_WIDTH, 50, 'F');

    // Title
    const title = quiz.quizTitle || `Quiz ${quiz.quizId}`;
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(fontColor.r, fontColor.g, fontColor.b);
    doc.text(title, this.PAGE_WIDTH / 2, 30, { align: 'center' });

    // Accent line under title
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(2);
    doc.line(this.MARGIN, 45, this.PAGE_WIDTH - this.MARGIN, 45);

    y = 60;

    // Notes above (if any)
    if (quiz.notesAbove) {
      const notesText = this.stripHtml(quiz.notesAbove);
      doc.setTextColor(80, 80, 80);
      y = this.addWrappedText(doc, notesText, y, 10, 'italic', { r: 80, g: 80, b: 80 });
      y += 10;
    }

    // Section header: QUESTIONS
    y = this.addSectionHeader(doc, 'QUESTIONS', y, bgColor, fontColor);
    y += 5;

    // Questions only (no answers)
    quiz.questions.forEach((q, index) => {
      y = this.checkPageBreak(doc, y, 30, bgColor);

      // Question number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(bgColor.r, bgColor.g, bgColor.b);
      doc.text(`Q${index + 1}.`, this.MARGIN, y);

      // Question text
      const questionText = this.stripHtml(q.question);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const questionLines = doc.splitTextToSize(questionText, this.CONTENT_WIDTH - 15);
      doc.text(questionLines, this.MARGIN + 15, y);
      y += questionLines.length * 5 + 8;
    });

    // Add page break before answers section
    doc.addPage();
    y = this.MARGIN;

    // Draw header bar on answers page
    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    doc.rect(0, 0, this.PAGE_WIDTH, 30, 'F');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(fontColor.r, fontColor.g, fontColor.b);
    doc.text('ANSWERS', this.PAGE_WIDTH / 2, 20, { align: 'center' });

    y = 45;

    // Answers section
    quiz.questions.forEach((q, index) => {
      y = this.checkPageBreak(doc, y, 25, bgColor);

      // Answer number with accent color
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text(`A${index + 1}.`, this.MARGIN, y);

      // Answer text - handle | and <li> as line breaks
      const answerText = this.formatAnswer(q.answer);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);

      // Split by our line break marker and render each line
      const answerParts = answerText.split('\n');
      let answerY = y;
      for (const part of answerParts) {
        if (part.trim()) {
          const lines = doc.splitTextToSize(part.trim(), this.CONTENT_WIDTH - 15);
          doc.text(lines, this.MARGIN + 15, answerY);
          answerY += lines.length * 4.5;
        }
      }
      y = answerY + 6;

      // Subtle separator line
      if (index < quiz.questions.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(this.MARGIN + 10, y, this.PAGE_WIDTH - this.MARGIN - 10, y);
        y += 6;
      }
    });

    // Notes below (if any)
    if (quiz.notesBelow) {
      y = this.checkPageBreak(doc, y, 30, bgColor);
      y += 10;
      doc.setDrawColor(bgColor.r, bgColor.g, bgColor.b);
      doc.setLineWidth(1);
      doc.line(this.MARGIN, y, this.PAGE_WIDTH - this.MARGIN, y);
      y += 10;
      const notesText = this.stripHtml(quiz.notesBelow);
      y = this.addWrappedText(doc, notesText, y, 10, 'italic', { r: 80, g: 80, b: 80 });
    }

    // Footer on all pages
    this.addFooters(doc, bgColor, fontColor);

    // Generate filename
    const filename = this.generateFilename(quiz);
    doc.save(filename);
  }

  /**
   * Add section header with colored background
   */
  private addSectionHeader(
    doc: jsPDF,
    text: string,
    y: number,
    bgColor: {r: number, g: number, b: number},
    fontColor: {r: number, g: number, b: number}
  ): number {
    doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    doc.rect(this.MARGIN, y - 5, this.CONTENT_WIDTH, 12, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(fontColor.r, fontColor.g, fontColor.b);
    doc.text(text, this.PAGE_WIDTH / 2, y + 3, { align: 'center' });
    return y + 15;
  }

  /**
   * Check if we need a page break and add one if necessary
   */
  private checkPageBreak(
    doc: jsPDF,
    y: number,
    needed: number,
    bgColor: {r: number, g: number, b: number}
  ): number {
    if (y > this.PAGE_HEIGHT - needed - this.MARGIN) {
      doc.addPage();
      return this.MARGIN;
    }
    return y;
  }

  /**
   * Add footers to all pages
   */
  private addFooters(
    doc: jsPDF,
    bgColor: {r: number, g: number, b: number},
    fontColor: {r: number, g: number, b: number}
  ): void {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Footer bar
      doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      doc.rect(0, this.PAGE_HEIGHT - 15, this.PAGE_WIDTH, 15, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(fontColor.r, fontColor.g, fontColor.b);
      doc.text(`Page ${i} of ${pageCount}`, this.PAGE_WIDTH / 2, this.PAGE_HEIGHT - 5, { align: 'center' });
      doc.text('Weekly Fifty', this.MARGIN, this.PAGE_HEIGHT - 5);
    }
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 103, g: 124, b: 115 }; // default green
  }

  /**
   * Strip HTML tags and decode entities
   */
  private stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  /**
   * Format answer text - handle | and <li> as line breaks
   */
  private formatAnswer(html: string): string {
    let text = html;

    // Replace <li> tags with line breaks
    text = text.replace(/<li[^>]*>/gi, '\n');
    text = text.replace(/<\/li>/gi, '');

    // Replace | with line breaks
    text = text.replace(/\s*\|\s*/g, '\n');

    // Strip remaining HTML
    const tmp = document.createElement('div');
    tmp.innerHTML = text;
    text = tmp.textContent || tmp.innerText || '';

    // Clean up multiple newlines but preserve intentional ones
    text = text.replace(/\n\s*\n/g, '\n');
    text = text.trim();

    return text;
  }

  /**
   * Add wrapped text and return new Y position
   */
  private addWrappedText(
    doc: jsPDF,
    text: string,
    y: number,
    fontSize: number,
    fontStyle: 'normal' | 'bold' | 'italic',
    color: { r: number, g: number, b: number }
  ): number {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color.r, color.g, color.b);

    const lines = doc.splitTextToSize(text, this.CONTENT_WIDTH);
    const lineHeight = fontSize * 0.4;

    for (const line of lines) {
      if (y > this.PAGE_HEIGHT - this.MARGIN - 20) {
        doc.addPage();
        y = this.MARGIN;
      }
      doc.text(line, this.MARGIN, y);
      y += lineHeight;
    }

    return y;
  }

  /**
   * Generate a safe filename for the PDF
   */
  private generateFilename(quiz: Quiz): string {
    const title = quiz.quizTitle || `Quiz_${quiz.quizId}`;
    const safeTitle = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    return `${safeTitle}.pdf`;
  }
}
