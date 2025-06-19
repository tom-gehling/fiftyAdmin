import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
    provideClientHydration,
    withEventReplay,
} from '@angular/platform-browser';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';

import { routes } from './app.routes';
import { environment } from '../environments/environment'; // ✅ make sure path is correct

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes, withComponentInputBinding()),
        provideAnimations(),
        provideClientHydration(withEventReplay()),

        provideFirebaseApp(() =>
            initializeApp({
                projectId: 'weeklyfifty-7617b',
                appId: '1:826354289266:web:67f1a0dcad32a87f2010eb',
                storageBucket: 'weeklyfifty-7617b.firebasestorage.app',
                apiKey: 'AIzaSyCAXtKw-nTmIWPHDc1U4OLfGmdLH0o73Ls',
                authDomain: 'weeklyfifty-7617b.firebaseapp.com',
                messagingSenderId: '826354289266',
                measurementId: 'G-G0GB39G4F3',
            })
        ),
        provideAnalytics(() => getAnalytics()),
        provideAuth(() => getAuth()),
        provideFirestore(() => getFirestore()),
    ],
};
