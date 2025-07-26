# Merf-Ai

A full-stack interview platform leveraging AI to generate and conduct coding interviews. The project includes a Node.js backend, a React frontend, and an optional Python script for additional processing.

## 🚀 Features
-User Authentication: Secure sign-up and login for personalized access.
-Interview Management: Create, schedule, and organize your interview sessions effortlessly.
-AI Voice Agent: An intelligent AI voice agent to guide and prepare you for interviews.
-Real-time Tracking: Monitor interview progress and performance as it happens.
-In-depth Interview Analytics: Gain actionable insights from detailed interview results for focused practice and improvement.
-Personalized Dashboard: A comprehensive profile and results dashboard to track your journey and progress.

# YT DEMO VIDEO

[![PrepWise Voice Agent Interview Prep, Merf AI + Gemini](http://img.youtube.com/vi/hTYmoewQM5o/mqdefault.jpg)](http://www.youtube.com/watch?v=hTYmoewQM5o)

## 🛠️ Technology Stack
- **Backend**: Node.js, Express, MongoDB (via Mongoose)  
- **Frontend**: React, Vite, Tailwind CSS  
- **Python Backend**: Python 3.x  
- **Authentication**: JWT / Passport  

## 📦 Prerequisites
- Node.js (version ≥14)  
- npm (version ≥6) or Yarn  
- Python 3.x  
- FFmpeg (for media processing)

## 🔧 Installation
1. Clone the repository:  
   ```bash
   git clone https://github.com/yourusername/merf-ai.git
   cd merf-ai
   ```

2. Install backend dependencies:  
   ```bash
   cd Backend
   npm install
   ```

3. Install frontend dependencies:  
   ```bash
   cd ../Frontend
   npm install
   ```

4. Install Python backend dependencies (optional):  
   ```bash
   cd ../python_backend
   pip install -r requirements.txt
   ```

## ⚙️ Configuration
### Environment Variables (Backend)
Create a `.env` file in `Backend/`:
```bash
PORT=5000
WS_PORT=5001
MONGO_URI=
JWT_SECRET=bsjhueuSYg52b2
GEMINI_API_KEY=
MURF_API_KEY=


```

### Environment Variables (Frontend)
Create a `.env` file in `Frontend/`:
```bash
VITE_API_URL=http://localhost:5000
VITE_GEMINI_API_KEY=
VITE_MURF_AI_API_KEY=
VITE_PYTHON_API_URL=http://127.0.0.1:5004
```
### Environment Variables (Pyhton Backend)

Create a `.env` file in `python_backend/`:
```bash
NODE_BACKEND_URL=http://localhost:5000/api/ai-results
GEMINI_API_KEY=
MERF_AI_API_KEY=
```

## 🎬 Setting up FFmpeg
Merf-Ai uses FFmpeg for media processing. On Windows:
1. Download the latest build from Gyan: https://www.gyan.dev/ffmpeg/builds/  
2. Extract the ZIP to a folder, e.g., `C:\ffmpeg`.  
3. Add FFmpeg bin to your system PATH:  
   - Press `Win + X` → System → Advanced system settings → Environment Variables.  
   - Under **System variables**, select **Path** → Edit → New.  
   - Add `C:\ffmpeg\bin` → OK.  
4. Verify:  
   ```bash
   ffmpeg -version
   ```

## 🏃‍♂️ Running the Application
1. Start the backend:  
   ```bash
   cd Backend
   npm run dev
   ```
2. Start the frontend:  
   ```bash
   cd ../Frontend
   npm run dev
   ```
3. (Optional) Run Python backend:  
   ```bash
   cd ../python_backend
   python main.py
   ```

Open your browser at `http://localhost:5173`.

## 📁 Project Structure
```
merf-ai/
├── Backend/              # Node.js + Express API
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
├── Frontend/             # React + Vite + Tailwind
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
├── python_backend/       #  Python scripts
│   ├── main.py
│   └── requirements.txt
└── README.md
```


