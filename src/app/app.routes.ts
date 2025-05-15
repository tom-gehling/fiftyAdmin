import { Routes } from '@angular/router';
import { MENU_ITEMS } from './shared/config/menu.config';

export const routes: Routes = [
   { path: '', redirectTo: 'home', pathMatch: 'full' },
  ...MENU_ITEMS.map(item => ({
    path: item.path,
    component: item.component,
    data: { animation: item.animation }
  }))
];
