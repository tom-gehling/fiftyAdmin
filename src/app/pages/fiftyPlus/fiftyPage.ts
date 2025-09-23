import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FiftyLayoutComponent } from './fiftyLayout';


@Component({
  selector: 'app-fifty-page',
  standalone: true,
  imports: [FiftyLayoutComponent],
  template: `
    <app-fifty-layout [type]="type" [title]="title"></app-fifty-layout>
  `
})
export class FiftyPageComponent implements OnInit {
  type!: 'archive' | 'exclusive' | 'collaboration' | 'question';
  title!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.type = this.route.snapshot.data['type'];
    this.title = this.route.snapshot.data['title'];
  }
}
