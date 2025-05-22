import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: '**',
        renderMode: RenderMode.Prerender,
    },
    {
        path: 'quizzes/:id',
        renderMode: RenderMode.Client,
    },
    {
        path: 'quizzes/:id/preview',
        renderMode: RenderMode.Client,
    },
];
