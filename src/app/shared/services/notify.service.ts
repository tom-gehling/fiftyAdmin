import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  private defaultLife = 3000; // ms

  constructor(private messageService: MessageService) {}

  success(detail: string, summary = 'Success', life = this.defaultLife) {
    this.messageService.add({ severity: 'success', summary, detail, life });
  }

  error(detail: string, summary = 'Error', life = this.defaultLife) {
    this.messageService.add({ severity: 'error', summary, detail, life });
  }

  warn(detail: string, summary = 'Warning', life = this.defaultLife) {
    this.messageService.add({ severity: 'warn', summary, detail, life });
  }

  info(detail: string, summary = 'Info', life = this.defaultLife) {
    this.messageService.add({ severity: 'info', summary, detail, life });
  }
}
