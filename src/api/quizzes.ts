import { Router } from "express";

export const quizzesRouter = Router();

quizzesRouter.get('/', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
} );

quizzesRouter.post('/', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
} );

quizzesRouter.get('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.put('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.delete('/:id', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.get('/:id/leaderboard', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});

quizzesRouter.post('/:id/answer', async (req, res) => {
  res.json({ message: 'Quizzes endpoint is under construction.' });
});