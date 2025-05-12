import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { QuestionComponent } from './question/question.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, QuestionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'fiftyAdmin';
}
