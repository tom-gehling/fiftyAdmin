import { trigger, transition, style, animate, query, group } from '@angular/animations';


export function slideFromLeft(){
    return trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter, :leave', 
          style({ position: 'absolute', width: '100%' }), 
          { optional: true }),
        group([
          query(':leave', [
            animate('150ms ease-out', style({ opacity: 0, transform: 'translateX(-20px)' }))
          ], { optional: true }),
          query(':enter', [
            style({ opacity: 0, transform: 'translateX(20px)' }),
            animate('150ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ], { optional: true })
        ])
      ])
    ])
}
