const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const port = config.PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => res.json({ 
    status: 'ok', 
    routes: ['/api/auth', '/api/sessions', '/api/aspsps', '/api/accounts/:id/transactions'] 
}));

// API routes
app.use('/api', apiRoutes);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
