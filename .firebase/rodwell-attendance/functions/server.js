const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrrodwellattendance = onRequest({"region":"asia-southeast1"}, (req, res) => server.then(it => it.handle(req, res)));
  