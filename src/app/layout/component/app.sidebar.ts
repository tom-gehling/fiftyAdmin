import { Component, ElementRef, OnInit } from '@angular/core';
import { AppMenu } from './app.menu';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MembershipService, MembershipTier } from '@/shared/services/membership.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [AppMenu, FormsModule, SelectButtonModule],
    template: `
    <div class="layout-sidebar flex flex-col p-2">
    <div class="flex justify-center mt-8 mb-4">
        <div class="mb-4">
        <p-selectButton 
        [options]="membershipOptions" 
        [(ngModel)]="selectedMembership" 
        optionLabel="label" 
        optionValue="value"
        (onChange)="onMembershipChange($event.value)"
        class="w-full"
        ></p-selectButton>
    </div>

    </div>
    <!-- Membership Select -->
    

   
    <app-menu></app-menu>
    </div>

    
    `
})
export class AppSidebar implements OnInit {
    selectedMembership: MembershipTier = MembershipTier.Admin;
    membershipOptions = [
        { label: 'Non Member', value: MembershipTier.None },
        { label: 'Fifty+', value: MembershipTier.Fifty },
        { label: 'Fifty+ Gold', value: MembershipTier.FiftyGold },
        { label: 'Admin', value: MembershipTier.Admin },
    ];

    constructor(public el: ElementRef, private membershipService: MembershipService) {}

    ngOnInit(): void {
        // sync with service
        this.membershipService.membership$.subscribe(level => this.selectedMembership = level);
    }

    onMembershipChange(level: MembershipTier): void {
        this.membershipService.setMembership(level);
    }
}