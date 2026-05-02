import { Hono } from 'hono';
import { reviewRoute } from './routes/review.route';

const app = new Hono().basePath('/api');

app.route('/review', reviewRoute);

export { app };
