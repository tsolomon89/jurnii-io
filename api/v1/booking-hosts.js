// Vercel routing shim → the isolated booking module (booking/api).
// Vercel serves serverless functions only from the repo-root /api directory, so
// this 1-line re-export keeps the /api/v1/... endpoints while the real handler
// lives in the copyable booking/ folder. See booking/README.md.
module.exports = require('../../booking/api/v1/booking-hosts.js');
