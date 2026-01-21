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
  styleUrls: ['./api-docs.scss']
})
export class ApiDocsComponent {
  endpoints = [
    {
      method: 'POST',
      path: '/api/login',
      desc: 'Authenticates user and returns JWT.',
      payload: '{ "username": "...", "password": "..." }',
      auth: 'None'
    },
    {
      method: 'GET',
      path: '/api/quizzes',
      desc: 'Retrieves all available quizzes.',
      payload: 'None',
      auth: 'None'
    },
    {
      method: 'POST',
      path: '/api/suggestions',
      desc: 'Submit a new quiz suggestion.',
      payload: '{ "title": "...", "description": "..." }',
      auth: 'User (Role 3)'
    }
  ];
}