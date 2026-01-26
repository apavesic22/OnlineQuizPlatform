import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';

import { CategoriesService } from '../../services/categoriesService';
import { QuizzesService } from '../../services/quizzesService';
import { AuthService } from '../../services/authService';
import { DifficultiesService } from '../../services/difficultiesService';

@Component({
  selector: 'create-quiz-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatFormFieldModule,
    MatRadioModule,
    MatIconModule,
  ],
  templateUrl: './create-quiz.html',
  styleUrls: ['./create-quiz.scss'],
})
export class CreateQuizPage implements OnInit {
  quizForm!: FormGroup;
  categories: any[] = [];
  difficulties: any[] = [];
  isVerifiedOrStaff: boolean = false;

  constructor(
    private fb: FormBuilder,
    private categoriesService: CategoriesService,
    private quizService: QuizzesService,
    private authService: AuthService,
    private difficultiesService: DifficultiesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.quizForm = this.fb.group({
      quiz_name: ['', Validators.required],
      category_id: [null, Validators.required],
      difficulty_id: [null, Validators.required],
      duration: [15, [Validators.required, Validators.min(5), Validators.max(60)]],
      questions: this.fb.array([]),
    });

    this.authService.whoami().subscribe((user) => {
      this.isVerifiedOrStaff = !!(
        user && 
        ((user.role_id && user.role_id >= 1 && user.role_id <= 3) || user.verified)
      );

      if (!this.isVerifiedOrStaff) {
        this.quizForm.get('duration')?.setValue(15);
        this.quizForm.get('duration')?.disable();
      }
    });

    this.categoriesService.getCategories().subscribe((data) => (this.categories = data));
    this.difficultiesService.getDifficulties().subscribe((data: any) => {
      this.difficulties = data;
    });

    this.addQuestion();
  }

  get questions() {
    return this.quizForm.get('questions') as FormArray;
  }

  addQuestion() {
    if (!this.isVerifiedOrStaff && this.questions.length >= 5) return;

    const q = this.fb.group({
      text: ['', Validators.required],
      type: ['multiple', Validators.required],
      options: this.fb.array([
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
        this.fb.control('', Validators.required),
      ]),
      correct_answer_index: [null, Validators.required],
      boolean_correct: [null],
    });

    q.get('type')?.valueChanges.subscribe((type) => {
      const optionsArray = q.get('options') as FormArray;
      
      if (type === 'boolean') {
        q.get('boolean_correct')?.setValidators([Validators.required]);
        
        q.get('correct_answer_index')?.clearValidators();
        q.get('correct_answer_index')?.setValue(null);
        
        optionsArray.controls.forEach(control => {
          control.clearValidators();
          control.updateValueAndValidity();
        });
      } else {
        q.get('correct_answer_index')?.setValidators([Validators.required]);
        q.get('boolean_correct')?.clearValidators();
        q.get('boolean_correct')?.setValue(null);
        
        optionsArray.controls.forEach(control => {
          control.setValidators([Validators.required]);
          control.updateValueAndValidity();
        });
      }
      q.get('boolean_correct')?.updateValueAndValidity();
      q.get('correct_answer_index')?.updateValueAndValidity();
    });

    this.questions.push(q);
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  getOptions(qIndex: number) {
    return (this.questions.at(qIndex).get('options') as FormArray).controls;
  }

  cancel() {
    this.router.navigate(['/']);
  }

  submitQuiz() {
    if (this.quizForm.invalid) {
       alert('Please fill out all fields correctly.');
       return;
    }

    const rawData = this.quizForm.getRawValue();
    const finalData = {
      ...rawData,
      duration: Number(rawData.duration),
      questions: rawData.questions.map((q: any) => {
        const actualAnswer = q.type === 'multiple' 
          ? q.options[q.correct_answer_index] 
          : q.boolean_correct;
        
        return {
          text: q.text,
          type: q.type,
          correct_answer: actualAnswer,
          options: q.type === 'multiple' ? q.options : ['True', 'False'],
        };
      }),
    };

    this.quizService.createQuiz(finalData).subscribe({
      next: () => {
        alert('Quiz created successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => console.error(err)
    });
  }
}