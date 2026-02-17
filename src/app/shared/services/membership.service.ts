import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum MembershipTier {
  None = 'None',
  Fifty = 'Fifty',
  FiftyGold = 'FiftyGold',
  Admin = 'Admin'
}

const TIER_ORDER = [MembershipTier.None, MembershipTier.Fifty, MembershipTier.FiftyGold, MembershipTier.Admin];

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private membershipSubject = new BehaviorSubject<MembershipTier>(MembershipTier.None);

  membership$: Observable<MembershipTier> = this.membershipSubject.asObservable();

  get currentMembership(): MembershipTier {
    return this.membershipSubject.value;
  }

  setMembership(tier: MembershipTier) {
    this.membershipSubject.next(tier);
  }

  /** Returns true if the current tier meets or exceeds the required tier */
  hasAccess(requiredTier: MembershipTier): boolean {
    return TIER_ORDER.indexOf(this.currentMembership) >= TIER_ORDER.indexOf(requiredTier);
  }

  get isPremium(): boolean {
    return this.hasAccess(MembershipTier.FiftyGold);
  }

  get isBasicOrAbove(): boolean {
    return this.hasAccess(MembershipTier.Fifty);
  }
}
