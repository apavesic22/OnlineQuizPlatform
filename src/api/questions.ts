import { Router } from "express";

export const questionsRouter = Router(); 

questionsRouter.put('/', async (req, res) => {
  res.json({ message: 'Questions endpoint is under construction.' });
} );

questionsRouter.delete('/', async (req, res) => {
  res.json({ message: 'Questions endpoint is under construction.' });
} );