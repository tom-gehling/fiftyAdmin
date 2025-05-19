// preview.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreviewService {
  private _quizData: any;

  setQuizData(data: any) {
    this._quizData = data;
  }

  getQuizData() {
    return this._quizData;
  }

  clear() {
    this._quizData = null;
  }
}
