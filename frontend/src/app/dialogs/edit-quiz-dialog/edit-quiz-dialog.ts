import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-admin-quiz-edit-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Quiz: {{ quizForm.get('quiz_name')?.value }}</h2>

    <mat-dialog-content [formGroup]="quizForm" class="dialog-content">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Quiz Title</mat-label>
        <input matInput formControlName="quiz_name" />
      </mat-form-field>

      <div formArrayName="questions">
        @for (q of questions.controls; track q; let i = $index) {
          <div [formGroupName]="i" class="question-block">
            <div class="header">
              <h3>Question {{ i + 1 }}</h3>
              <button
                mat-icon-button
                color="warn"
                type="button"
                (click)="removeQuestion(i)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Question Text</mat-label>
              <textarea
                matInput
                formControlName="question_text"
                rows="2"
              ></textarea>
            </mat-form-field>

            <div formArrayName="answers" class="answers-grid">
              @for (a of getAnswers(i).controls; track a; let j = $index) {
                <div [formGroupName]="j" class="answer-row">
                  <mat-checkbox formControlName="is_correct"></mat-checkbox>
                  <mat-form-field>
                    <input
                      matInput
                      formControlName="answer_text"
                      placeholder="Answer {{ j + 1 }}"
                    />
                  </mat-form-field>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="quizForm.invalid"
        (click)="save()"
      >
        Submit Changes
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .glass-wrapper {
      background: rgba(15, 23, 42, 0.95);
      color: #f1f5f9;
      padding: 10px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 15px !important;
      
      mat-icon { color: #06b6d4; }
      span { color: #94a3b8; font-weight: 400; font-size: 1.1rem; }
    }

    .dialog-content {
      min-width: 700px;
      max-height: 75vh;
      padding-top: 20px !important;
    }

    .meta-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 30px;
    }
    .id-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    .divider {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        color: #64748b;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 0.8rem;

        &::after {
            content: "";
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin-left: 15px;
        }
    }

    .question-block {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(6, 182, 212, 0.3);
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;

      .q-number {
        background: #8b5cf6; /* Purple */
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: 800;
        font-size: 0.8rem;
      }
    }

    .delete-btn {
        color: rgba(239, 68, 68, 0.5);
        &:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    }

    .answers-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 15px;
    }

    .answer-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.2);
      padding: 5px 15px;
      border-radius: 10px;
      border: 1px solid transparent;
      transition: all 0.2s ease;

      &.is-correct {
        border-color: #22c55e;
        background: rgba(34, 197, 94, 0.05);
      }
      
      mat-form-field { width: 100%; }
    }

    ::v-deep .mat-mdc-text-field-wrapper {
        background-color: rgba(255, 255, 255, 0.02) !important;
    }
    ::v-deep .mat-mdc-form-field-focus-overlay {
        background-color: transparent !important;
    }

    .dialog-actions {
      padding: 20px !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      gap: 12px;
    }

    .cancel-btn { color: #94a3b8; font-weight: 600; }

    .save-btn {
      background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%) !important;
      color: white !important;
      font-weight: 800;
      border-radius: 10px;
      padding: 0 25px !important;
      
      &:disabled { opacity: 0.5; filter: grayscale(1); }
    }

    .full-width { width: 100%; }
  `
  ],
})
export class AdminQuizEditDialog implements OnInit {
  quizForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AdminQuizEditDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { quiz_id: number },
    private http: HttpClient,
  ) {
    this.quizForm = this.fb.group({
      quiz_name: ['', Validators.required],
      category_id: [null, Validators.required],
      difficulty_id: [null, Validators.required],
      questions: this.fb.array([]),
    });
  }

  ngOnInit() {
    this.http
      .get<any>(`/api/quizzes/${this.data.quiz_id}/QuizEdit`)
      .subscribe((quiz) => {
        this.quizForm.patchValue({
          quiz_name: quiz.quiz_name,
          category_id: quiz.category_id,
          difficulty_id: quiz.difficulty_id,
        });

        quiz.questions.forEach((q: any) => {
          const questionGroup = this.fb.group({
            question_id: [q.question_id],
            question_text: [q.question_text, Validators.required],
            answers: this.fb.array(
              q.answers.map((a: any) =>
                this.fb.group({
                  answer_id: [a.answer_id],
                  answer_text: [a.answer_text, Validators.required],
                  is_correct: [a.is_correct === 1],
                }),
              ),
            ),
          });
          this.questions.push(questionGroup);
        });
      });
  }

  get questions() {
    return this.quizForm.get('questions') as FormArray;
  }

  getAnswers(qIndex: number) {
    return this.questions.at(qIndex).get('answers') as FormArray;
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  onCancel() {
    this.dialogRef.close();
  }

  save() {
    if (this.quizForm.valid) {
      this.http
        .put(`/api/quizzes/${this.data.quiz_id}`, this.quizForm.value)
        .subscribe({
          next: () => {
            alert('Quiz updated successfully!');
            this.dialogRef.close(true);
          },
          error: (err) => console.error('Update failed', err),
        });
    }
  }
}
