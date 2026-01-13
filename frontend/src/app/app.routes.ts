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
    path: 'my-stats',
    loadComponent: () =>
      import('./components/my-stats/my-stats').then((m) => m.MyStatsComponent),
    title: 'My Stats',
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile').then((m) => m.ProfilePage),
    title: 'Profile',
  },
  {
    path: 'manage-suggestions',
    loadComponent: () =>
      import('./pages/manage-suggestions/manage-suggestions').then((m) => m.ManageSuggestionsPage),
    title: 'Manage Suggestions',
  },
  {
    path: 'manage-categories',
    loadComponent: () =>
      import('./pages/manage-categories/manage-categories').then((m) => m.ManageCategoriesPage),
    title: 'Manage Categories',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
