import { Route } from '@angular/router';

export const routes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
    title: 'Home',
  },
  {
    path: 'play/:quizId',
    loadComponent: () =>
      import('./pages/play-quiz/play-quiz').then((m) => m.PlayQuizPage),
    title: 'Play Quiz',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/create-quiz/create-quiz').then((m) => m.CreateQuizPage),
    title: 'Create quiz',
  },
  {
    path: 'leaderboard',
    loadComponent: () =>
      import('./pages/leaderboard-page/leaderboard.page').then((m) => m.LeaderboardPage),
    title: 'Leaderboard',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
