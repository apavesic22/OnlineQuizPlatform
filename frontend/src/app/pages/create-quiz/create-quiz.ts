import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

import { CategoriesService } from '../../services/categories';
import { Category } from '../../models/category';

@Component({
  standalone: true,
  selector: 'create-quiz-page',
  templateUrl: './create-quiz.html',
  styleUrls: ['./create-quiz.scss'],
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ]
})
export class CreateQuizPage implements OnInit {

  quizForm!: FormGroup;
  categories: Category[] = [];

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService
  ) {}

  ngOnInit(): void {
    this.quizForm = this.fb.group({
      quiz_name: ['', Validators.required],
      category_id: [null, Validators.required]
    });

    this.loadCategories();
  }

  loadCategories() {
    this.categoriesService.getCategories().subscribe({
      next: (categories) => this.categories = categories,
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  onCreateQuiz() {
    if (this.quizForm.invalid) return;

    console.log(this.quizForm.value);
    // next step: POST /api/quizzes
  }
}
