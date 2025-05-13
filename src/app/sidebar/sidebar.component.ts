import { Component } from '@angular/core';

import {MatSidenavModule} from '@angular/material/sidenav';

@Component({
  selector: 'sidebar',
  imports: [MatSidenavModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {

}
