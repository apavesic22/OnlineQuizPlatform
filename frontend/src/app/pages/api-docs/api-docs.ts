import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatIconModule],
  templateUrl: './api-docs.html',
  styleUrls: ['./api-docs.scss'],
})
export class ApiDocsComponent {
  endpoints = [
    // --- Categories API ---
    {
      method: 'GET',
      path: '/api/categories',
      desc: 'Fetch all quiz categories ordered by name.',
    },
    {
      method: 'POST',
      path: '/api/categories',
      desc: 'Create a new category.',
    },
    {
      method: 'PUT',
      path: '/api/categories/:categoryId',
      desc: 'Update an existing category name.',
    },
    {
      method: 'DELETE',
      path: '/api/categories/:categoryId',
      desc: 'Deletes a category by category ID.',
    },

    // --- Difficulties API ---
    {
      method: 'GET',
      path: '/api/difficulties',
      desc: 'Retrieve list of all quiz difficulty levels.',
    },

    // --- Quizzes API ---
    {
      method: 'GET',
      path: '/api/quizzes',
      desc: 'Fetch paginated list of quizzes with likes and creator info.',
    },
    {
      method: 'POST',
      path: '/api/quizzes',
      desc: 'Create a new quiz with questions and answer options.',
    },
    {
      method: 'PUT',
      path: '/api/quizzes/:id',
      desc: 'Update quiz metadata, questions, and answers.',
    },
    {
      method: 'DELETE',
      path: '/api/quizzes/:id',
      desc: 'Hard delete a quiz and all associated attempts/logs.',
    },
    {
      method: 'GET',
      path: '/api/quizzes/:id/questions',
      desc: 'Fetch all questions for a specific quiz.',
    },
    {
      method: 'POST',
      path: '/api/quizzes/:id/like',
      desc: 'Toggle a like/unlike on a quiz.',
    },
    {
      method: 'GET',
      path: '/api/quizzes/:id/QuizEdit',
      desc: 'Fetch full quiz data for the editing interface.',
    },
    {
      method: 'POST',
      path: '/api/quizzes/:id/submit',
      desc: 'Submit answers for a quiz attempt and get results.',
    },
        {
      method: 'POST',
      path: '/api/quizzes/:id/attempts',
      desc: 'Keeps track of user attempts in the database.',
    },


    // --- Statistics API ---
    {
      method: 'GET',
      path: '/api/statistics/my-stats',
      desc: 'Get chronological performance history for the user.',
    },
    {
      method: 'GET',
      path: '/api/statistics/difficulty-stats',
      desc: 'Get distribution data of quiz difficulties.',
    },

    // --- Suggestions API ---
    {
      method: 'GET',
      path: '/api/suggestions',
      desc: 'List all submitted quiz suggestions.',
    },
    {
      method: 'POST',
      path: '/api/suggestions',
      desc: 'Submit a new quiz idea or feedback.',
    },
    {
      method: 'PATCH',
      path: '/api/suggestions/:id/status',
      desc: 'Update suggestion status (approved/rejected/pending).',
    },

    // --- Users API ---
    {
      method: 'GET',
      path: '/api/users',
      desc: 'Paginated list of all registered users.',
    },
    {
      method: 'POST',
      path: '/api/users',
      desc: 'Manually create a new user account.',
    },
    {
      method: 'GET',
      path: '/api/users/leaderboard',
      desc: 'Fetch top 10 users by score and current user rank.',
    },
    {
      method: 'GET',
      path: '/api/users/:username',
      desc: 'Fetch detailed profile for a specific user.',
    },
    {
      method: 'PUT',
      path: '/api/users/:username',
      desc: 'Update user email, role, or verification status.',
    },
    {
      method: 'DELETE',
      path: '/api/users/:username',
      desc: 'Wipe a user and ALL their data (Quizzes, Likes, Stats).',
    },
    // --- Auth API ---
    {
      method: 'POST',
      path: '/api/auth/',
      desc: 'Authenticates a user',
    },
    {
      method: 'GET',
      path: '/api/auth/',
      desc: 'Returns data about logged in user',
    },
    {
      method: 'DELETE',
      path: '/api/auth/',
      desc: 'Logs out the user',
    },
  ];
}