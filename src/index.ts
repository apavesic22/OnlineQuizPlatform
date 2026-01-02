import express from 'express';
import morgan from 'morgan';
import { config } from 'dotenv';

import { errorHandler } from './helpers/errors';
import { openDb } from './helpers/db';
import { authRouter, initAuth } from './helpers/auth';
import { uploadRouter } from './helpers/fileupload';
import { usersRouter } from './api/users';
import { quizzesRouter } from './api/quizzes';
import { questionsRouter } from './api/questions';
import { categoriesRouter } from './api/categories';

config({ quiet: true });

const app = express();

// log http requests
app.use(morgan(process.env.MORGANTYPE || 'tiny'));

// static files (angular app)
const frontendPath = process.env.FRONTEND || './frontend/dist/frontend/browser';
app.use(express.static(frontendPath));
// static uploaded files
app.use('/uploads', express.static(process.env.UPLOADSDIR || './uploads'));

// api url prefix
const apiUrl = process.env.APIURL || '/api';

// automatic parsing of json payloads
app.use(express.json());

async function main() {
  await initAuth(app);
  console.log('Initialize authorization framework');

  await openDb();
  console.log('Main database connected');
  
  // auth router
  app.use('/api/auth', authRouter);
  
  app.use(apiUrl + '/upload', uploadRouter);
  app.use(apiUrl + '/users', usersRouter);  
  app.use(apiUrl + '/quizzes', quizzesRouter);
  app.use(apiUrl + '/questions', questionsRouter);
  app.use(apiUrl + '/categories', categoriesRouter);

  // install our error handler (must be the last app.use)
  app.use(errorHandler);

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

main().catch(err => {
  console.error('ERROR startup failed due to', err);
})