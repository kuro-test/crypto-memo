// backend/index.js
const express = require('express');
const app = express();
const PORT = 3000;

// middleware
app.use(express.json());

// sample API route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// 啟動 server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
