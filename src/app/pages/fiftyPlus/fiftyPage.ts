import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FiftyLayoutComponent } from './fiftyLayout';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

@Component({
  selector: 'app-fifty-page',
  standalone: true,
  imports: [FiftyLayoutComponent],
  template: `
    <app-fifty-layout [type]="type" [title]="title"></app-fifty-layout>
  `
})
export class FiftyPageComponent implements OnInit {
  type!: QuizTypeEnum;
  title!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.type = this.route.snapshot.data['type'] as QuizTypeEnum;
    this.title = this.route.snapshot.data['title'];
  }
}
