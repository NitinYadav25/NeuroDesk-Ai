const http = require('http');

const data = JSON.stringify({
  title: 'Test Conversation',
  model: 'mistral',
  agentType: 'general'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/chat/conversations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1ZTYxZDQ4My03NDIzLTQwNGUtOTU5My0wYjhlM2FmZjA1MjEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3NzgzOTc0OTMsImV4cCI6MTc3OTAwMjI5M30.638ZYl6Bbs1FkjEMnVQE7wLkBJY9nKJXsBJ9tXopVfo'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
