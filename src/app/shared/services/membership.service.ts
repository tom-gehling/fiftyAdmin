import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum MembershipTier {
  Fifty = 'Fifty',
  FiftyGold = 'FiftyGold',
  Admin = 'Admin'
}


@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  // Default tier
  private membershipSubject = new BehaviorSubject<MembershipTier>(MembershipTier.Fifty);

  // Exposed observable for components to subscribe to
  membership$: Observable<MembershipTier> = this.membershipSubject.asObservable();

  // Get current membership synchronously
  get currentMembership(): MembershipTier {
    return this.membershipSubject.value;
  }

  // Set membership tier
  setMembership(tier: MembershipTier) {
    this.membershipSubject.next(tier);
    console.log('Membership changed to:', tier);
  }
}
