// Vercel serverless entry point. Every request is rewritten here by vercel.json
// and handed to the Express app, which keeps its own /api/* route prefixes.
module.exports = require('../server.js');
