import { MenuItem } from 'primeng/api';

export interface AppMenuItem extends MenuItem {
  roles?: ('member' | 'admin')[]; // optional roles for visibility
}

export const ALL_MENU_ITEMS: AppMenuItem[] = [
  { label: 'Dashboard', routerLink: ['/'], roles: ['member', 'admin'] },
  { label: 'Profile', routerLink: ['/profile'], roles: ['member', 'admin'] },
  { label: 'Admin Panel', routerLink: ['/admin'], roles: ['admin'] },
  {
    label: 'UI Components',
    icon: 'pi pi-fw pi-desktop',
    roles: ['member', 'admin'],
    items: [
      { label: 'Form Layout', routerLink: ['/uikit/formlayout'] },
      { label: 'Input', routerLink: ['/uikit/input'] },
      { label: 'Button', routerLink: ['/uikit/button'] },
      // more items...
    ]
  }
];
