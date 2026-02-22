import serverless from 'serverless-http';
import app from '../App';

export const handler = serverless(app);
