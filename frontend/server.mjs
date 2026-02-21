import express from 'express';
import serverless from 'serverless-http';
import { handler as astroHandler } from './server/entry.mjs';
import path from 'path';

const app = express();

// Set up static file serving from the built client directory
const clientDir = path.join(process.cwd(), 'client');
app.use(express.static(clientDir));

// Route all other traffic to Astro's SSR handler
app.use((req, res, next) => {
    astroHandler(req, res, next);
});

// Export the serverless-http wrapped Express app
export const handler = serverless(app);
