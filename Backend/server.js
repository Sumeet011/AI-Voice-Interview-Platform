// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios'); // For Murf.ai or other API calls
const auth = require('./middleware/auth'); // Authentication middleware

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Update Backend/server.js
const allowedOrigins = [
    'https://merf-ai.vercel.app',
    'https://merf-ai-git-main-sumeet011s-projects.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5004'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/interviews',auth, require('./routes/interview'));
app.use('/api/user', require('./routes/getUser'));
app.use('/api/ai-results', require('./routes/ResultRoute')); // AI Results route

app.get('/', (req, res) => {
    res.send('API is running');
});

// ✅ Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});


