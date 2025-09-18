import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { DialogService } from 'primeng/dynamicdialog';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch()),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } } }),
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
        DialogService
    ]
};
