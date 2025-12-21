import { Router, Request, Response } from "express";

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.post('/', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.get('/:username', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.put('/:username', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.delete('/:username', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.get('/:userId/roles', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

usersRouter.put('/:userId/roles', async (req, res) => {
  res.json({ message: 'Users endpoint is under construction.' });
});

