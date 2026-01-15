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
      import('./pages/my-stats/my-stats').then((m) => m.MyStatsComponent),
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
    path: 'manage-users',
    loadComponent: () =>
      import('./pages/manage-users/manage-users').then((m) => m.ManageUsersPage),
    title: 'Manage Users',
  },
  {
    path: 'difficulty-dist',
    loadComponent: () =>
      import('./pages/difficulty-dist/difficulty-dist').then((m) => m.DifficultyDistComponent),
    title: 'Difficulty Distribution',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
