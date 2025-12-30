import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home').then(m => m.HomePage),
    title: 'Home'
  },
  {
    path: 'quizzes',
    loadComponent: () =>
      import('./pages/quizzes/quizzes').then(m => m.QuizzesPage),
    title: 'Quizzes'
  },
  {
  path: 'play/:quizId',
  loadComponent: () =>
    import('./pages/play-quiz/play-quiz').then(m => m.PlayQuizPage),
  title: 'Play Quiz'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
