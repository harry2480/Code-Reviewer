import { Hono } from 'hono';
import { githubWebhookRoute } from './routes/github-webhook.route';
import { reviewRoute } from './routes/review.route';

const app = new Hono().basePath('/api');

app.route('/review', reviewRoute);
app.route('/github', githubWebhookRoute);

export { app };
