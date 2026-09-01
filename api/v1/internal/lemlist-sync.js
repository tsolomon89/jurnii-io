// Vercel routing shim → the Lemlist import subsystem (integrations/lemlist-zoho).
// Vercel serves serverless functions only from the repo-root /api directory, so
// this 1-line re-export keeps the endpoint while the real handler lives with the
// rest of its subsystem. See integrations/lemlist-zoho/README.md.
module.exports = require("../../../integrations/lemlist-zoho/handler.js");
