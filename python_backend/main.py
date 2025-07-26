import speech_recognition as sr
import requests
import json
import os
import time
import asyncio
from flask import Flask, render_template_string, send_file, request, jsonify, redirect, url_for
from flask_cors import CORS # Import CORS
import io # Import io for handling in-memory audio
from pydub import AudioSegment # Import pydub
from dotenv import load_dotenv

load_dotenv(dotenv_path="./.env")


# --- Configuration ---
MERF_AI_API_KEY = os.getenv("MERF_AI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
AUDIO_FILE_PATH = "ai_response.wav"
USER_AUDIO_FILE_PATH_RAW = "user_input_raw.webm" # Store raw incoming audio (often webm)
USER_AUDIO_FILE_PATH_WAV = "user_input_processed.wav" # Path for WAV converted audio
PORT = 5004 # Changed to 5004, ensure no conflict
NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173/")
HOST = os.getenv("PYTHON_BACKEND_HOST", "0.0.0.0")

if not MERF_AI_API_KEY:
    print("[WARNING] MERF_AI_API_KEY is not set in environment variables.")
if not GEMINI_API_KEY:
    print("[WARNING] GEMINI_API_KEY is not set in environment variables.")
if not NODE_BACKEND_URL:
    print("[WARNING] NODE_BACKEND_URL is not set in environment variables.")

app = Flask(__name__)
CORS(app) # Enable CORS for your Flask app!

# Global variable to store current interview details
current_interview_context = {}
# Global variable to store the full interview transcript
interview_transcript = []
# USER_ID global variable is now removed and will be passed dynamically

# --- Speech-to-Text (STT) Function - Adapted to read from file and handle conversion ---
def transcribe_audio_file(audio_file_path):
    r = sr.Recognizer()
    
    # Try to load the audio directly first (if it's already a valid WAV/etc.)
    # If it's not, we'll try to convert it.
    try:
        with sr.AudioFile(audio_file_path) as source:
            print(f"Transcribing audio file: {audio_file_path} (direct attempt)")
            audio = r.record(source) # Read the entire audio file
            text = r.recognize_google(audio)
            print(f"You said: {text}")
            return text
    except ValueError as e:
        print(f"Direct transcription failed ({e}). Attempting conversion to WAV...")
        try:
            # Load the potentially problematic audio file
            # pydub can automatically detect format based on content
            audio_segment = AudioSegment.from_file(audio_file_path)
            
            # Export to a WAV file that speech_recognition expects (PCM 16-bit, 44.1kHz typically)
            audio_segment.export(USER_AUDIO_FILE_PATH_WAV, format="wav")
            
            print(f"Successfully converted {audio_file_path} to {USER_AUDIO_FILE_PATH_WAV}")
            
            # Now transcribe the converted WAV file
            with sr.AudioFile(USER_AUDIO_FILE_PATH_WAV) as source:
                print(f"Transcribing audio file: {USER_AUDIO_FILE_PATH_WAV} (after conversion)")
                audio = r.record(source)
                text = r.recognize_google(audio)
                print(f"You said: {text}")
                return text
        except Exception as e_convert:
            print(f"Error during audio conversion or re-transcription: {e_convert}")
            return None
    except Exception as e:
        print(f"An unexpected error occurred during transcription: {e}")
        return None

# --- Large Language Model (LLM) Function ---
async def get_gemini_response(prompt_text):
    print("Getting response from AI...")

    context_prompt = ""
    if current_interview_context:
        context_prompt += f"You are an AI interviewer conducting an interview. "
        context_prompt += f"The interview is for a '{current_interview_context.get('job_role', 'general')}' position. "
        context_prompt += f"The interview type is '{current_interview_context.get('interview_type', 'general')}' "
        context_prompt += f"with a difficulty level of '{current_interview_context.get('difficulty', 'medium')}'. "
        
        # Safely handle key_skills, which might be a list or a JSON string from the form
        if current_interview_context.get('key_skills'):
            skills = current_interview_context['key_skills']
            if isinstance(skills, str):
                try:
                    skills = json.loads(skills) # Try to parse if it's a JSON string
                except json.JSONDecodeError:
                    skills = [s.strip() for s in skills.split(',')] # Fallback to comma separation
            
            if isinstance(skills, list) and skills:
                context_prompt += f"Key skills to focus on are: {', '.join(skills)}. "
        
        context_prompt += f"The interview title is: '{current_interview_context.get('interview_title', 'Untitled Interview')}'. "
        context_prompt += f"Here is a description: '{current_interview_context.get('description', 'No specific description provided.')}'. "
        context_prompt += "Your questions should be relevant to these details. "

    full_prompt = context_prompt + "\nUser says: " + prompt_text
    print(f"Full prompt sent to Gemini:\n---\n{full_prompt}\n---")

    chat_history = []
    chat_history.append({"role": "user", "parts": [{"text": full_prompt}]})

    payload = {"contents": chat_history}
    apiKey = GEMINI_API_KEY
    apiUrl = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}"

    try:
        response = await asyncio.to_thread(
            requests.post,
            apiUrl,
            headers={'Content-Type': 'application/json'},
            data=json.dumps(payload)
        )
        response.raise_for_status()
        result = response.json()

        if result.get("candidates") and result["candidates"][0].get("content") and \
           result["candidates"][0]["content"].get("parts") and \
           result["candidates"][0]["content"]["parts"][0].get("text"):
            ai_response = result["candidates"][0]["content"]["parts"][0]["text"]
            print(f"AI says: {ai_response}")
            return ai_response
        else:
            print("AI response structure is unexpected or content is missing.")
            print(f"Full Gemini response (unexpected structure): {result}")
            return "I'm sorry, I couldn't generate a response."
    except requests.exceptions.RequestException as e:
        print(f"Error communicating with Gemini API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Gemini API error response text: {e.response.text}")
        print("Please ensure your Gemini API key is correct and linked to a project with billing enabled.")
        return "I'm sorry, I'm having trouble connecting to the AI."
    except json.JSONDecodeError:
        print("Error decoding JSON response from Gemini API.")
        if 'response' in locals():
            print(f"Raw Gemini response (if available): {response.text}")
        return "I'm sorry, I received an unreadable response from the AI."

# --- Text-to-Speech (TTS) Function using Murf.ai ---
def synthesize_merf_ai(text_to_synthesize, murf_api_key):
    if not murf_api_key or murf_api_key.startswith("AIza"):
        print("❌ Invalid Murf.ai API key. Please get your API key from your Murf.ai dashboard.")
        return None

    url = "https://api.murf.ai/v1/speech/generate"
    headers = {
        "Content-Type": "application/json",
        "api-key": murf_api_key
    }

    payload = {
        "text": text_to_synthesize,
        "voiceId": "en-US-natalie",
        "format": "WAV",
        "sampleRate": 44100,
        "modelVersion": "GEN2"
    }

    print("Synthesizing speech with Murf.ai...")

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        audio_file_url = response_data.get("audioFile")

        if audio_file_url:
            print(f"✅ Audio file URL: {audio_file_url}")
            print("Downloading audio...")

            audio_response = requests.get(audio_file_url, stream=True)
            audio_response.raise_for_status()

            with open(AUDIO_FILE_PATH, "wb") as f:
                for chunk in audio_response.iter_content(chunk_size=8192):
                    f.write(chunk)

            print(f"✅ Audio saved to {AUDIO_FILE_PATH}")
            return AUDIO_FILE_PATH
        else:
            print("❌ No audio URL in Murf.ai response.")
            print(f"Response data: {response_data}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Error calling Murf.ai: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Murf.ai error response: {e.response.text}")
        return None
    except json.JSONDecodeError:
        print("❌ Failed to decode Murf.ai JSON response.")
        if 'response' in locals():
            print(f"Raw response: {response.text}")
        return None

# --- Mock Interview Data ---
mock_interviews = [
    {
        "_id": '1',
        "interview_title": 'Frontend Developer Interview',
        "interview_type": 'Technical',
        "job_role": 'Junior Frontend Developer',
        "difficulty": 'Medium',
        "key_skills": ['React', 'JavaScript', 'HTML', 'CSS'],
        "duration": '45 mins',
        "description": 'Assess basic React concepts and fundamental web technologies.',
    },
    {
        "_id": '2',
        "interview_title": 'Backend Engineer Interview',
        "interview_type": 'Technical',
        "job_role": 'Senior Backend Engineer',
        "difficulty": 'Hard',
        "key_skills": ['Python', 'Django', 'APIs', 'Databases'],
        "duration": '60 mins',
        "description": 'Deep dive into scalable backend architectures and system design.',
    },
    {
        "_id": '3',
        "interview_title": 'Product Manager Interview',
        "interview_type": 'Behavioral',
        "job_role": 'Product Manager',
        "difficulty": 'Medium',
        "key_skills": ['Strategy', 'Communication', 'Roadmapping'],
        "duration": '30 mins',
        "description": 'Focus on product sense and leadership qualities.',
    },
      {
        "_id": '4',
        "interview_title": 'Data Scientist Interview',
        "interview_type": 'Technical',
        "job_role": 'Data Scientist',
        "difficulty": 'Hard',
        "key_skills": ['Python', 'Machine Learning', 'Statistics', 'SQL'],
        "duration": '60 mins',
        "description": 'Evaluate knowledge of data analysis, modeling, and interpretation.',
    },
    {
        "_id": '5',
        "interview_title": 'UX Designer Interview',
        "interview_type": 'Portfolio Review',
        "job_role": 'UX Designer',
        "difficulty": 'Medium',
        "key_skills": ['Figma', 'User Research', 'Prototyping', 'Usability Testing'],
        "duration": '40 mins',
        "description": 'Review portfolio and discuss design process and user-centered design principles.',
    },
]


# --- Flask Routes ---

# This route serves the interview selection page
@app.route('/')
def index():
   # Get userId from query parameter
    user_id = request.args.get('userId')  # Get userId from query parameter
    
    if not user_id:
        print("No userId provided in URL. Please access this page with a valid userId parameter.")
        return "Error: No userId provided. Please access this page from the React application.", 400
    
    print(f"Rendering interview selection page for userId: {user_id}")
    
    interview_cards_html = ""
    for interview in mock_interviews:
        key_skills_json = json.dumps(interview['key_skills']) # Ensure JSON string for hidden input
        
        skills_html = ""
        if interview.get('key_skills') and isinstance(interview['key_skills'], list) and interview['key_skills']:
            skills_html = f"<p><strong>Key Skills:</strong> {', '.join(interview['key_skills'])}</p>"

        # Conditionally add userId hidden input if it exists
        user_id_input = f'<input type="hidden" name="userId" value="{user_id}">' if user_id else ''

        interview_cards_html += f"""
        <form class="interview-card" action="/select_interview" method="post">
            {user_id_input}
            <input type="hidden" name="interview_id" value="{interview.get('_id', '')}">
            <input type="hidden" name="interview_title" value="{interview.get('interview_title', 'Untitled Interview')}">
            <input type="hidden" name="interview_type" value="{interview.get('interview_type', 'General')}">
            <input type="hidden" name="job_role" value="{interview.get('job_role', 'N/A')}">
            <input type="hidden" name="difficulty" value="{interview.get('difficulty', 'N/A')}">
            <input type="hidden" name="key_skills" value='{key_skills_json}'>
            <input type="hidden" name="duration" value="{interview.get('duration', 'N/A')}">
            <input type="hidden" name="description" value="{interview.get('description', 'No description provided')}">

            <div class="card-header">
                <span class="card-type">{interview.get('interview_type', 'Interview')}</span>
                <span class="card-publish-setting">Public</span> 
            </div>
            <h3>{interview.get('interview_title', 'Untitled Interview')}</h3>
            <p><strong>Role:</strong> {interview.get('job_role', 'N/A')}</p>
            <p><strong>Difficulty:</strong> {interview.get('difficulty', 'N/A')}</p>
            <p><strong>Duration:</strong> {interview.get('duration', 'N/A')}</p>
            {skills_html}
            {interview.get('description') and f'<p><strong>Description:</strong> {interview["description"]}</p>'}
            <button type="submit" class="select-interview-button">Start Interview</button>
        </form>
        """

    return render_template_string(f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Select Your Interview - PrepWise</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            :root {{
                --bg-dark: #1A1A2E;
                --card-bg: #22253D;
                --text-light: #E0E0E0;
                --text-medium: #B0B0B0;
                --accent-purple: #8B5CF6;
                --accent-blue: #6366F1;
                --red-button: #EF4444;
                --red-button-hover: #DC2626;
                --border-color: #3B3E5B;
                --input-bg: #2C2F48;
            }}

            body {{
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                background-color: var(--bg-dark);
                color: var(--text-light);
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                box-sizing: border-box;
            }}

            .header-top {{
                width: 90%;
                max-width: 1200px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 30px;
            }}

            .logo {{
                font-size: 28px;
                font-weight: 700;
                color: var(--text-light);
            }}

            h2 {{
                color: var(--accent-purple);
                font-size: 2em;
                margin-bottom: 30px;
                text-align: center;
                width: 100%;
            }}

            .interview-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 25px;
                width: 90%;
                max-width: 1200px;
                justify-content: center;
            }}

            .interview-card {{
                background-color: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 25px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }}

            .interview-card:hover {{
                transform: translateY(-8px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
            }}
            
            .card-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }}

            .card-type {{
                background-color: #4a4a6a;
                color: #e0e0e0;
                font-size: 0.75em;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 15px;
            }}

            .card-publish-setting {{
                background-color: #4CAF50; /* Green for Public */
                color: white;
                font-size: 0.75em;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 15px;
            }}


            .interview-card h3 {{
                color: var(--accent-blue);
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 1.5em;
            }}

            .interview-card p {{
                font-size: 0.95em;
                line-height: 1.4;
                color: var(--text-medium);
                margin: 0;
            }}

            .interview-card strong {{
                color: var(--text-light);
            }}

            .select-interview-button {{
                background-color: var(--accent-purple);
                color: white;
                padding: 10px 15px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1em;
                font-weight: 600;
                margin-top: 15px;
                transition: background-color 0.3s ease;
                align-self: flex-start; /* Align button to start within card */
            }}

            .select-interview-button:hover {{
                background-color: #7B4FE0;
            }}

            @media (max-width: 768px) {{
                .header-top {{
                    flex-direction: column;
                    gap: 15px;
                }}
                h2 {{
                    font-size: 1.5em;
                }}
                .interview-grid {{
                    grid-template-columns: 1fr; /* Stack cards on small screens */
                }}
            }}
        </style>
    </head>
    <body>
        <div class="header-top">
            <div class="logo">PrepWise</div>
            </div>
        <h2>Select an Interview to Begin</h2>
        <div class="interview-grid">
            {interview_cards_html}
        </div>
    </body>
    </html>
    """,FRONTEND_URL)

# This route receives the interview details when a card is selected
@app.route('/select_interview', methods=['POST'])
def select_interview_and_redirect():
    global current_interview_context
    global interview_transcript # Reset transcript for new interview
    interview_transcript = []
    try:
        # The frontend form sends standard form data, so we use request.form
        # If this were a JSON fetch request, you'd use request.get_json()
        interview_data = request.get_json() 
        
        raw_skills = interview_data.get('key_skills', '[]') # Default to '[]' if not present
        if isinstance(raw_skills, str):
            try:
                key_skills = json.loads(raw_skills)
            except json.JSONDecodeError:
                key_skills = [s.strip() for s in raw_skills.split(',') if s.strip()]
        elif isinstance(raw_skills, list):
            key_skills = raw_skills
        else:
            key_skills = []

        current_interview_context = {
            "interview_id": interview_data.get("interview_id"),
            "interview_title": interview_data.get("interview_title"),
            "interview_type": interview_data.get("interview_type"),
            "job_role": interview_data.get("job_role"),
            "difficulty": interview_data.get("difficulty"),
            "key_skills": key_skills,
            "duration": interview_data.get("duration"),
            "description": interview_data.get("description"),
        }
        print(f"Selected interview context set: {current_interview_context}")

        # Get userId from the incoming data
        user_id = interview_data.get("userId")

        # Redirect to the actual AI interview page within the same Flask app, passing userId
        return jsonify({"redirect_url": url_for('interview_agent_page', userId=user_id)}), 200 # Send JSON response for redirection

    except Exception as e:
        print(f"Error selecting interview: {e}")
        return jsonify({"error": str(e), "message": "Could not start interview. Please go back and try again."}), 500


# This is the main route for the AI agent once an interview is selected
@app.route('/interview_agent')
def interview_agent_page():
    display_title = current_interview_context.get("interview_title", "General AI Interview")
    user_id = request.args.get('userId') # Get userId from query parameter

    return render_template_string(f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PrepWise AI Interview</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

            :root {{
                --bg-dark: #1A1A2E;
                --card-bg: #22253D;
                --text-light: #E0E0E0;
                --text-medium: #B0B0B0;
                --accent-purple: #8B5CF6;
                --accent-blue: #6366F1;
                --red-button: #EF4444;
                --red-button-hover: #DC2626;
                --border-color: #3B3E5B;
                --input-bg: #2C2F48;
            }}

            body {{
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 0;
                background-color: var(--bg-dark);
                color: var(--text-light);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                min-height: 100vh;
                overflow: hidden;
            }}

            .main-container {{
                width: 90%;
                max-width: 1200px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 20px;
                box-sizing: border-box;
            }}

            header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                padding: 15px 0;
                border-bottom: 1px solid var(--border-color);
            }}

            .header-left {{
                display: flex;
                align-items: center;
                gap: 20px;
            }}

            .logo {{
                font-size: 24px;
                font-weight: 700;
                color: var(--text-light);
            }}

            .interview-title {{
                font-size: 18px;
                font-weight: 500;
                color: var(--accent-purple);
            }}

            .header-right {{
                display: flex;
                align-items: center;
                gap: 15px;
            }}

            .status-icon {{
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #4CAF50;
                border: 2px solid var(--card-bg);
            }}

            .status-icon.red {{
                background-color: #F44336;
            }}

            .technical-button {{
                background-color: var(--card-bg);
                color: var(--text-light);
                border: 1px solid var(--border-color);
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.3s ease, border-color 0.3s ease;
            }}

            .technical-button:hover {{
                background-color: #33365A;
                border-color: var(--accent-blue);
            }}

            .content-area {{
                flex-grow: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 40px;
                width: 100%;
                padding: 40px 0;
            }}

            .card {{
                background-color: var(--card-bg);
                border-radius: 12px;
                padding: 30px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                width: 300px;
                height: 350px;
                justify-content: center;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                border: 1px solid var(--border-color);
            }}

            .avatar-container {{
                width: 150px;
                height: 150px;
                border-radius: 50%;
                background-color: var(--bg-dark);
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
                overflow: hidden;
            }}

            .avatar-container img {{
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
            }}

            .avatar-container .icon-circle {{
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background-color: var(--bg-dark);
                display: flex;
                justify-content: center;
                align-items: center;
                color: var(--text-light);
                font-size: 40px;
            }}
            .avatar-container .icon-circle i {{
                color: var(--text-light);
            }}

            .card-name {{
                font-size: 20px;
                font-weight: 600;
                color: var(--text-light);
            }}

            .status-text {{
                font-size: 1em;
                color: var(--text-medium);
                margin-top: 10px;
            }}
            
            audio {{
                display: none; /* Hide the default audio player */
            }}

            footer {{
                width: 100%;
                padding: 20px 0;
                border-top: 1px solid var(--border-color);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }}

            .input-group {{
                width: 70%;
                max-width: 600px;
                display: flex;
                align-items: center;
                background-color: var(--input-bg);
                border-radius: 10px;
                padding: 10px 20px;
                border: 1px solid var(--border-color);
            }}

            .input-group input {{
                flex-grow: 1;
                background: none;
                border: none;
                outline: none;
                color: var(--text-light);
                font-size: 16px;
                padding: 5px 0;
            }}

            .input-group input::placeholder {{
                color: var(--text-medium);
            }}

            .action-buttons {{
                display: flex;
                gap: 15px;
            }}

            .action-button {{
                background-color: var(--card-bg);
                color: var(--text-light);
                border: 1px solid var(--border-color);
                padding: 12px 25px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background-color 0.3s ease, border-color 0.3s ease;
            }}

            .action-button i {{
                font-size: 18px;
            }}

            .action-button.start-recording {{
                background-color: var(--accent-purple);
                border-color: var(--accent-purple);
            }}

            .action-button.start-recording:hover {{
                background-color: #7B4FE0;
                border-color: #7B4FE0;
            }}
            
            .action-button.stop-recording {{
                background-color: #d9534f; /* A reddish color for stop */
                border-color: #d9534f;
                display: none; /* Hidden by default */
            }}

            .action-button.stop-recording:hover {{
                background-color: #c9302c;
                border-color: #c9302c;
            }}

            .action-button:disabled {{
                background-color: #5a5a5a;
                cursor: not-allowed;
                border-color: #5a5a5a;
            }}

            .action-button.leave {{
                background-color: var(--red-button);
                border-color: var(--red-button);
            }}

            .action-button.leave:hover {{
                background-color: var(--red-button-hover);
                border-color: var(--red-button-hover);
            }}

            @media (max-width: 768px) {{
                header {{
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }}
                .header-left, .header-right {{
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }}
                .content-area {{
                    flex-direction: column;
                }}
                .card {{
                    width: 90%;
                    max-width: 350px;
                }}
                .input-group {{
                    width: 90%;
                }}
                .action-buttons {{
                    flex-direction: column;
                    width: 90%;
                }}
                .action-button {{
                    width: 100%;
                    justify-content: center;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="main-container">
            <header>
                <div class="header-left">
                    <div class="logo">PrepWise</div>
                    <div class="interview-title">{display_title}</div>
                </div>
                <div class="header-right">
                    <div class="status-icon"></div>
                    <div class="status-icon red"></div>
                    <button class="technical-button">Technical Interview</button>
                </div>
            </header>

            <div class="content-area">
                <div class="card interviewer-card">
                    <div class="avatar-container">
                        <div class="icon-circle">
                            <i class="fas fa-comment-dots"></i>
                        </div>
                    </div>
                    <div class="card-name">AI Interviewer</div>
                </div>

                <div class="card interviewee-card">
                    <div class="avatar-container">
                        <img src="https://via.placeholder.com/150/8B5CF6/FFFFFF?text=YOU" alt="Adrian's Avatar">
                    </div>
                    <div class="card-name">Adrian (You)</div>
                    <p id="status" class="status-text">Click "Start Replying" to begin.</p>
                </div>
            </div>

            <footer>
                <div class="input-group">
                    <input type="text" id="userInput" placeholder="What job experience level are you targeting?" disabled>
                </div>
                <div class="action-buttons">
                    <button class="action-button start-recording" id="startRecordingButton">
                        <i class="fas fa-microphone"></i> Start Replying
                    </button>
                    <button class="action-button stop-recording" id="stopRecordingButton">
                        <i class="fas fa-stop-circle"></i> Stop Replying
                    </button>
                    <button class="action-button leave" id="leaveInterviewButton">
                        <i class="fas fa-power-off"></i> Leave Interview
                    </button>
                </div>
            </footer>
        </div>

        <audio id="audioPlayer"></audio>

        <script>
            let mediaRecorder;
            let audioChunks = [];
            let audioPlayer = document.getElementById('audioPlayer');
            let statusDiv = document.getElementById('status');
            let startRecordingButton = document.getElementById('startRecordingButton');
            let stopRecordingButton = document.getElementById('stopRecordingButton');
            let leaveInterviewButton = document.getElementById('leaveInterviewButton');
            let userInputField = document.getElementById('userInput');

            // Get userId from the URL query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const dynamicUserId = urlParams.get('userId');
            console.log("Dynamic User ID from URL:", dynamicUserId);


            // Event Listeners for the new buttons
            startRecordingButton.addEventListener('click', startRecording);
            stopRecordingButton.addEventListener('click', stopRecording);
            leaveInterviewButton.addEventListener('click', exitAgent); // Modified to call exitAgent

            function updateStatus(message, color = 'var(--text-medium)') {{
                statusDiv.textContent = message;
                statusDiv.style.color = color;
            }}

            async function startRecording() {{
                try {{
                    // Set mimeType to 'audio/webm' for broader browser compatibility
                    // Most browsers record efficiently to webm by default.
                    const stream = await navigator.mediaDevices.getUserMedia({{ audio: true }});
                    mediaRecorder = new MediaRecorder(stream, {{ mimeType: 'audio/webm' }}); 
                    audioChunks = [];

                    mediaRecorder.ondataavailable = (event) => {{
                        audioChunks.push(event.data);
                    }};

                    mediaRecorder.onstop = async () => {{
                        const audioBlob = new Blob(audioChunks, {{ type: 'audio/webm' }}); // Match Blob type to mimeType
                        sendAudioToBackend(audioBlob);
                        stream.getTracks().forEach(track => track.stop()); // Stop microphone access
                    }}
                    ;

                    mediaRecorder.start();
                    updateStatus("Recording... Click 'Stop Replying' when done.");
                    startRecordingButton.style.display = 'none';
                    stopRecordingButton.style.display = 'inline-flex';
                    leaveInterviewButton.disabled = false;
                    userInputField.disabled = true;
                }} catch (error) {{
                    console.error('Error accessing microphone:', error);
                    updateStatus('Error accessing microphone. Please allow microphone access.', 'var(--red-button)');
                    startRecordingButton.disabled = false; // Re-enable if error
                    stopRecordingButton.style.display = 'none';
                }}
            }}

            function stopRecording() {{
                if (mediaRecorder && mediaRecorder.state === 'recording') {{
                    mediaRecorder.stop();
                    updateStatus("Processing your response...");
                    startRecordingButton.style.display = 'inline-flex';
                    stopRecordingButton.style.display = 'none';
                    startRecordingButton.disabled = true; // Disable until AI responds
                }}
            }}

            async function sendAudioToBackend(audioBlob) {{
                const formData = new FormData();
                // Ensure the filename extension matches the actual Blob type (e.g., .webm)
                formData.append('audio_file', audioBlob, 'user_input.webm'); 

                try {{
                    const response = await fetch('/upload_audio', {{
                        method: 'POST',
                        body: formData
                    }});
                    const data = await response.json();

                    if (data.user_text) {{
                        updateStatus("You said: " + data.user_text);
                        // Add user text to transcript
                        await fetch('/add_to_transcript', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ role: 'user', text: data.user_text }})
                        }});

                        // Directly ask AI for response after user speech is processed
                        updateStatus("Getting response from AI...");
                        const aiResponse = await fetch('/get_ai_response', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ prompt: data.user_text }})
                        }});
                        const aiData = await aiResponse.json();

                        if (aiData.ai_response_text) {{
                            // Add AI text to transcript
                            await fetch('/add_to_transcript', {{
                                method: 'POST',
                                headers: {{ 'Content-Type': 'application/json' }},
                                body: JSON.stringify({{ role: 'ai', text: aiData.ai_response_text }})
                            }});

                            updateStatus("Synthesizing speech...");

                            const audioPlayResponse = await fetch('/play_audio', {{
                                method: 'POST',
                                headers: {{ 'Content-Type': 'application/json' }},
                                body: JSON.stringify({{ text: aiData.ai_response_text }})
                            }});
                            const audioPlayData = await audioPlayResponse.json();

                            if (audioPlayData.audio_url) {{
                                audioPlayer.src = audioPlayData.audio_url + '?cache=' + new Date().getTime();
                                audioPlayer.load();
                                audioPlayer.play().catch(e => {{
                                    console.error("Error playing audio:", e);
                                    updateStatus("Error playing audio. Check console.", "red");
                                }});
                                updateStatus("Playing AI response...", "var(--accent-blue)");
                                await new Promise(resolve => {{
                                    audioPlayer.onended = resolve;
                                    audioPlayer.onerror = () => {{
                                        console.error("Audio playback error.");
                                        updateStatus("Audio error. Please try again.", "red");
                                        resolve();
                                    }};
                                }});
                                updateStatus("Ready for your next response. Click 'Start Replying'.");
                            }} else {{
                                updateStatus("Could not synthesize audio response.", "var(--red-button)");
                            }}
                        }} else {{
                            updateStatus("No AI response received.", "var(--red-button)");
                        }}
                    }} else {{
                        updateStatus("I didn't catch that. Please try speaking again. Click 'Start Replying'.", "var(--text-medium)");
                    }}
                }} catch (error) {{
                    console.error("Error in AI Agent:", error);
                    updateStatus("An error occurred: " + error.message, "var(--red-button)");
                }} finally {{
                    startRecordingButton.disabled = false;
                    userInputField.disabled = false;
                }}
            }}

            async function exitAgent() {{
                if (mediaRecorder && mediaRecorder.state === 'recording') {{
                    mediaRecorder.stop();
                }}
                audioPlayer.pause();
                audioPlayer.src = '';
                updateStatus("Ending interview and generating results...", "var(--accent-purple)");
                startRecordingButton.style.display = 'inline-flex';
                stopRecordingButton.style.display = 'none';
                startRecordingButton.disabled = true; // Disable until results are processed
                leaveInterviewButton.disabled = true;
                userInputField.disabled = true;

                try {{
                    const response = await fetch('/end_interview', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ userId: dynamicUserId }}) // Pass the dynamic user ID
                    }});
                    const data = await response.json();

                    if (response.ok) {{
                        updateStatus("Interview ended. Results saved!", "green");
                        console.log("Interview Result Saved:", data);
                        // Optionally redirect to a results page or home
                        window.location.href = "http://localhost:5173/";
                    }} else {{
                        updateStatus("Failed to save interview results: " + (data.message || "Unknown error"), "red");
                        console.error("Error saving interview results:", data);
                    }}
                }} catch (error) {{
                    console.error("Network error while ending interview:", error);
                    updateStatus("Network error during result saving. Check console.", "red");
                }} finally {{
                    startRecordingButton.disabled = false;
                    leaveInterviewButton.disabled = false;
                    userInputField.disabled = false;
                }}
            }}

            // Add a submit event listener to the form on the index page
            document.querySelectorAll('.interview-card').forEach(form => {{
                form.addEventListener('submit', async (event) => {{
                    event.preventDefault();
                    const formData = new FormData(form);
                    const jsonData = Object.fromEntries(formData.entries());

                    // Manually parse key_skills if it's a string, then re-stringify for the JSON body
                    let keySkillsValue = jsonData['key_skills'];
                    try {{
                        jsonData['key_skills'] = JSON.parse(keySkillsValue);
                    }} catch (e) {{
                        // If it's not valid JSON, treat it as a comma-separated string
                        jsonData['key_skills'] = keySkillsValue.split(',').map(s => s.trim()).filter(s => s);
                    }}

                    const response = await fetch('/select_interview', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify(jsonData)
                    }});
                    const data = await response.json();
                    if (response.ok && data.redirect_url) {{
                        window.location.href = data.redirect_url;
                    }} else {{
                        console.error('Error selecting interview:', data.error || 'Unknown error');
                        alert('Error starting interview. Please try again.');
                    }}
                }});
            }});

            window.onload = async () => {{
                updateStatus("Click 'Start Replying' to begin your response.");
                stopRecordingButton.style.display = 'none'; // Ensure stop button is hidden initially
                leaveInterviewButton.disabled = false; // Enable Leave Interview button by default
                userInputField.disabled = true;

                // Make the initial greeting from AI
                await sendInitialGreeting();
            }};

            async function sendInitialGreeting() {{
                updateStatus("AI is preparing the first question...");
                try {{
                    const initialPrompt = "Start the interview with a greeting and your first question based on the selected interview context.";
                    const aiResponse = await fetch('/get_ai_response', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify({{ prompt: initialPrompt }})
                    }});
                    const aiData = await aiResponse.json();

                    if (aiData.ai_response_text) {{
                        // Add AI greeting to transcript
                        await fetch('/add_to_transcript', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ role: 'ai', text: aiData.ai_response_text }})
                        }});

                        updateStatus("Synthesizing AI greeting...");
                        const audioPlayResponse = await fetch('/play_audio', {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }},
                            body: JSON.stringify({{ text: aiData.ai_response_text }})
                        }});
                        const audioPlayData = await audioPlayResponse.json();

                        if (audioPlayData.audio_url) {{
                            audioPlayer.src = audioPlayData.audio_url + '?cache=' + new Date().getTime();
                            audioPlayer.load();
                            audioPlayer.play().catch(e => {{
                                console.error("Error playing AI greeting audio:", e);
                                updateStatus("Error playing AI greeting. Check console.", "red");
                            }});
                            updateStatus("Playing AI response...", "var(--accent-blue)");
                            await new Promise(resolve => {{
                                audioPlayer.onended = resolve;
                                audioPlayer.onerror = () => {{
                                    console.error("AI greeting audio playback error.");
                                    updateStatus("AI greeting audio error. Please try again.", "red");
                                    resolve();
                                }};
                            }});
                            updateStatus("AI has spoken. Click 'Start Replying' to respond.");
                        }} else {{
                            updateStatus("Could not synthesize AI greeting audio.", "var(--red-button)");
                        }}
                    }} else {{
                        updateStatus("No AI greeting received.", "var(--red-button)");
                    }}
                }} catch (error) {{
                    console.error("Error fetching initial AI greeting:", error);
                    updateStatus("Error getting initial AI greeting: " + error.message, "var(--red-button)");
                }}
            }}
        </script>
    </body>
    </html>
    """)

# New route to add conversation turns to the transcript
@app.route('/add_to_transcript', methods=['POST'])
def add_to_transcript():
    global interview_transcript
    data = request.json
    role = data.get('role')
    text = data.get('text')
    if role and text:
        interview_transcript.append({"role": role, "text": text, "timestamp": time.time()})
        print(f"Added to transcript: {role}: {text[:50]}...") # Print first 50 chars
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Missing role or text"}), 400

# New route to end the interview and send results to Node.js backend
@app.route('/end_interview', methods=['POST'])
async def end_interview():
    global interview_transcript
    global current_interview_context
    try:
        data = request.json
        user_id = data.get('userId') # Get userId from the frontend

        if not user_id:
            print("[ERROR] No userId provided in /end_interview request.")
            return jsonify({"message": "User ID is required to save interview results."}), 400

        if not interview_transcript:
            print("[ERROR] No interview transcript to process in /end_interview.")
            return jsonify({"message": "No interview transcript to process."}), 400

        full_transcript_text = "\n".join([f"{entry['role'].upper()}: {entry['text']}" for entry in interview_transcript])
        
        # --- Step 1: Ask Gemini to generate score, feedback, and recommendation ---
        assessment_prompt = (
            f"Based on the following interview transcript for a '{current_interview_context.get('job_role', 'general')}' position "
            f"with difficulty '{current_interview_context.get('difficulty', 'medium')}', "
            f"and focusing on skills like {', '.join(current_interview_context.get('key_skills', ['general skills']))}, "
            f"please provide a comprehensive assessment. "
            f"Your response should be a JSON object with the following structure:\n"
            f'{{"score": <integer 0-100>, "feedback": "<string>", "recommendation": "<string: Hire|Do Not Hire|Further Interview|Strong Hire|Weak Hire|N/A>"}}\n'
            f"Here is the transcript:\n\n{full_transcript_text}"
        )

        print("[INFO] Sending transcript to Gemini for final assessment...")
        print(f"[DEBUG] Assessment Prompt: {assessment_prompt}")

        # Configure Gemini for structured JSON response
        chat_history = [{"role": "user", "parts": [{"text": assessment_prompt}]}]
        payload = {
            "contents": chat_history,
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "score": {"type": "INTEGER"},
                        "feedback": {"type": "STRING"},
                        "recommendation": {"type": "STRING", "enum": ["Hire", "Do Not Hire", "Further Interview", "Strong Hire", "Weak Hire", "N/A"]}
                    },
                    "propertyOrdering": ["score", "feedback", "recommendation"]
                }
            }
        }
        apiKey = GEMINI_API_KEY
        apiUrl = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}"

        try:
            assessment_response = await asyncio.to_thread(
                requests.post,
                apiUrl,
                headers={'Content-Type': 'application/json'},
                data=json.dumps(payload)
            )
            assessment_response.raise_for_status()
            assessment_result = assessment_response.json()
        except Exception as e:
            print(f"[ERROR] Failed to get assessment from Gemini: {e}")
            return jsonify({"message": f"Failed to get assessment from Gemini: {e}"}), 500

        ai_assessment = {}
        if assessment_result.get("candidates") and assessment_result["candidates"][0].get("content") and \
           assessment_result["candidates"][0]["content"].get("parts") and \
           assessment_result["candidates"][0]["content"]["parts"][0].get("text"):
            try:
                ai_assessment = json.loads(assessment_result["candidates"][0]["content"]["parts"][0]["text"])
                print(f"[INFO] AI Assessment received: {ai_assessment}")
            except json.JSONDecodeError:
                print("[ERROR] Error decoding AI assessment JSON.")
                ai_assessment = {"score": None, "feedback": "AI assessment could not be parsed.", "recommendation": "N/A"}
        else:
            print("[ERROR] AI assessment response structure is unexpected or content is missing.")
            ai_assessment = {"score": None, "feedback": "AI assessment not generated.", "recommendation": "N/A"}

        # --- Step 2: Prepare data for Node.js backend ---
        result_payload = {
            "userId": user_id,
            "aiGeneratedContent": full_transcript_text, # Send the full transcript
            "aiModelUsed": "gemini-2.0-flash", # Or dynamically get from config
            "sourceDataReference": f"Interview ID: {current_interview_context.get('interview_id', 'N/A')}",
            "status": "Generated", # Initial status, can be 'Reviewed' later
            "score": ai_assessment.get("score"),
            "feedback": ai_assessment.get("feedback"),
            "recommendation": ai_assessment.get("recommendation"),
            "originalInterviewDate": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), # Current time
            "originalCandidateIdentifier": "User-" + user_id, # Placeholder, replace with actual candidate info
        }

        # --- Step 3: Send data to Node.js backend ---
        print(f"[INFO] Sending data to Node.js backend: {NODE_BACKEND_URL}")
        print(f"[DEBUG] Payload: {json.dumps(result_payload, indent=2)}")
        try:
            node_response = requests.post(NODE_BACKEND_URL, json=result_payload)
            node_response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
            print(f"[INFO] Successfully sent interview result to Node.js backend. Response: {node_response.text}")
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Error communicating with Node.js backend: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"[ERROR] Node.js backend error response: {e.response.text}")
                return jsonify({"message": f"Failed to save interview result to backend: {e.response.text}"}), 500
            return jsonify({"message": f"Failed to save interview result to backend: {e}"}), 500
        except Exception as e:
            print(f"[ERROR] Unexpected error sending to Node.js backend: {e}")
            return jsonify({"message": f"Unexpected error sending to Node.js backend: {e}"}), 500

        # Clear transcript and context after saving
        interview_transcript = []
        current_interview_context = {}

        return jsonify({"message": "Interview result saved successfully!", "node_response": node_response.json()}), 200

    except Exception as e:
        print(f"[ERROR] An unexpected error occurred during end_interview: {e}")
        return jsonify({"message": f"An internal error occurred: {e}"}), 500

@app.route('/upload_audio', methods=['POST'])
async def upload_audio():
    if 'audio_file' not in request.files:
        return jsonify({"user_text": None, "error": "No audio file provided"}), 400
    
    audio_file = request.files['audio_file']
    if audio_file.filename == '':
        return jsonify({"user_text": None, "error": "No selected file"}), 400

    if audio_file:
        # Save the incoming raw audio file
        audio_file.save(USER_AUDIO_FILE_PATH_RAW)
        user_text = transcribe_audio_file(USER_AUDIO_FILE_PATH_RAW)
        
        # Clean up both temporary files
        if os.path.exists(USER_AUDIO_FILE_PATH_RAW):
            os.remove(USER_AUDIO_FILE_PATH_RAW)
        if os.path.exists(USER_AUDIO_FILE_PATH_WAV):
            os.remove(USER_AUDIO_FILE_PATH_WAV) # Remove the converted WAV too

        if user_text:
            return jsonify({"user_text": user_text})
    return jsonify({"user_text": None, "error": "Failed to process audio"}), 500

@app.route('/get_ai_response', methods=['POST'])
async def get_ai_response_route():
    data = request.json
    prompt_text = data.get('prompt')
    if prompt_text:
        ai_response_text = await get_gemini_response(prompt_text)
        return jsonify({"ai_response_text": ai_response_text})
    return jsonify({"ai_response_text": None}), 400

@app.route('/play_audio', methods=['POST'])
def play_audio_route():
    data = request.json
    text_to_synthesize = data.get('text')
    if text_to_synthesize:
        audio_file = synthesize_merf_ai(text_to_synthesize, MERF_AI_API_KEY)
        if audio_file:
            return jsonify({"audio_url": f"/audio/{os.path.basename(audio_file)}"})
    return jsonify({"audio_url": None}), 400

@app.route('/audio/<filename>')
def serve_audio(filename):
    if filename == os.path.basename(AUDIO_FILE_PATH):
        return send_file(AUDIO_FILE_PATH, mimetype="audio/wav")
    return "File not found", 404

def run_flask_app():
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)

if __name__ == "__main__":
    print(f"Opening browser at {FRONTEND_URL}")
    import webbrowser
    run_flask_app()
