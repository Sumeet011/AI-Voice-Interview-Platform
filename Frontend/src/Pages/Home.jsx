import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import roboImage from '../assets/robo.jpg';

// Assuming you have a CSS file for styling these cards in your React project
// import './InterviewCard.css'; // If you're using Tailwind, this might not be strictly necessary for base styles

// No longer need useNavigate for this direct Flask redirect
// import { useNavigate } from 'react-router-dom';

const InterviewCard = ({ interview, user }) => {
    // Destructure interview details from the nested 'details' object
    const { interviewTitle, interviewType, jobRole, difficulty, keySkills, interviewDuration, description } = interview.details;
    const { publishSetting } = interview;

    const handleCardClick = async () => {
        console.log("Interview card clicked:", interview);
        console.log("User data:", user);

        // Map the interview details from your frontend structure to the backend's expected structure
        // Ensure these keys match what your Flask /select_interview endpoint expects
        const interviewDetailsToSend = {
            interview_title: interviewTitle,
            interview_type: interviewType,
            job_role: jobRole,
            difficulty: difficulty,
            key_skills: keySkills, // This should be an array or convertible to JSON string
            duration: interviewDuration,
            description: description,
            interview_id: interview._id, // Send the unique ID
            userId: user?._id || user?.id, // Add the real user ID
        };

        try {
            // Send the interview details to your Flask backend
            // Note: Flask's request.form expects URL-encoded data for standard form submissions,
            // but if you're using fetch with 'Content-Type': 'application/json',
            // Flask's request.json will parse it.
            // Given the previous Flask update, it expects form data, so let's adjust the fetch body.
            // However, a simple POST with JSON is often cleaner for AJAX.
            // Let's stick with JSON as it's more common for React/API interactions.
            // (The Flask backend was updated in the previous response to expect request.form for /select_interview,
            // but for a React component, sending JSON is more idiomatic.
            // I will assume the Flask backend is updated to expect JSON for /select_interview,
            // as that's what the previous `handleCardClick` was set up for.)

            const response = await fetch(`${import.meta.env.VITE_PYTHON_API_URL}/select_interview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Send as JSON
                },
                body: JSON.stringify(interviewDetailsToSend), // Stringify the JSON object
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Backend confirmed interview selection:', data.message);
                const link=import.meta.env.VITE_PYTHON_API_URL+data.redirect_url;
                console.log(link)
                
                // Use the redirect_url from the backend response
                if (data.redirect_url) {
                    window.location.href = link;
                } else {
                    console.error('No redirect URL received from backend');
                    alert('Error: No redirect URL received from backend');
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to send interview details to backend:', errorData.error);
                alert('Error starting interview: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Network error or unexpected issue when contacting Flask backend:', error);
            alert('Could not connect to the AI interview backend. Is it running on http://127.0.0.1:5004?');
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 flex flex-col h-full transition-transform duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
                <span className="bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-1 rounded-full">
                    {interviewType || 'Interview'}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${publishSetting === 'Public' ? 'bg-green-700 text-green-200' : 'bg-gray-600 text-gray-300'}`}>{publishSetting}</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{interviewTitle || 'Untitled Interview'}</h3>
            <div className="text-gray-400 text-sm mb-2">
                <strong>Role:</strong> {jobRole || 'N/A'}
            </div>
            <div className="text-gray-400 text-sm mb-2">
                <strong>Difficulty:</strong> {difficulty || 'N/A'}
            </div>
            <div className="text-gray-400 text-sm mb-2">
                <strong>Key Skills:</strong> {Array.isArray(keySkills) && keySkills.length > 0 ? keySkills.join(', ') : 'N/A'}
            </div>
            <div className="text-gray-400 text-sm mb-2">
                <strong>Duration:</strong> {interviewDuration ? `${interviewDuration} min` : 'N/A'}
            </div>
            {description && (
                <div className="text-gray-400 text-sm mb-4">
                    <strong>Description:</strong> {description}
                </div>
            )}
            <div className="flex justify-end items-center mt-auto">
                <button
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition duration-150 ease-in-out"
                    onClick={handleCardClick} // Call the new handler here
                >
                    Start Interview
                </button>
            </div>
        </div>
    );
};



const Home = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  //fetch user name only
  useEffect(() => {
  const fetchUser = async () => {

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data); // Assuming the user object contains name and email
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Could not load user data');
    }

  };
  fetchUser();
},[]);

  useEffect(() => {
    const fetchInterviews = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/interviews`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch interviews');
        const data = await res.json();
        setInterviews(data); // Assuming the interviews are returned in the response
      } catch {
        setError('Could not load interviews');
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove JWT token
    navigate('/login'); // Redirect to login page
  };

  const handleStartInterview = () => {
    navigate('/create-interview');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans px-4 md:px-8 py-6">
  {/* Top Navigation Bar */}
  <nav className="flex items-center justify-between px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xl mb-10 border border-gray-700">
    {/* Brand */}
    <div className="flex items-center space-x-2">
      <span className="text-3xl font-extrabold text-purple-400 tracking-wide">PrepWise</span>
    </div>

    {/* Profile Section */}
    <div className="flex items-center gap-4">
      <span className="hidden sm:inline text-sm text-gray-300">{user ? user.name : 'Guest'}</span>
      <img
        src="https://placehold.co/40x40/8B5CF6/FFFFFF?text=User"
        alt="User Profile"
        className="w-10 h-10 rounded-full border-2 border-purple-500 object-cover shadow-sm cursor-pointer"
        onClick={() => navigate('/profile')}
        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/40x40/6B46C1/FFFFFF?text=Error"; }}
      />
      <button
        onClick={handleLogout}
        className="bg-red-600 hover:bg-red-700 transition-all duration-300 px-4 py-2 text-sm rounded-md font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Logout
      </button>
    </div>
  </nav>

  {/* Main Content */}
  <div className="container mx-auto">
    {/* Hero Section */}
    <div className="relative h-120 flex flex-col md:flex-row items-center bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 p-6 md:p-10 mb-12">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 opacity-20 rounded-2xl"></div>
      <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-5"></div>

      {/* Text Content */}
      <div className="relative z-10 w-full md:w-1/2 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-white drop-shadow">
          Get Interview-Ready with AI-Powered Practice & Feedback
        </h1>
        <p className="text-gray-300 text-md md:text-lg mb-6">
          Practice real interview questions and get instant insights to improve.
        </p>
        <button
          onClick={handleStartInterview}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg text-lg font-semibold shadow-lg transform hover:-translate-y-1 transition-all duration-300"
        >
          Create an Interview
        </button>
      </div>

      {/* Robot Image */}
      <div className="relative h-90 z-10 w-full md:w-1/2 flex justify-center mt-8 md:mt-0">
        <img
          src={roboImage}
          alt="AI Robot"
          className="max-w-xs md:max-w-md rounded-xl shadow-xl"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://placehold.co/300x250/333333/FFFFFF?text=Image+Error";
          }}
        />
      </div>
    </div>

    {/* Past Interviews Section */}
    <section>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Your Past Interviews</h2>
      {loading ? (
        <div className="text-center text-gray-400">Loading interviews...</div>
      ) : error ? (
        <div className="text-center text-red-400">{error}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {interviews.length === 0 ? (
            <div className="col-span-full text-center text-gray-400">No interviews found.</div>
          ) : (
            interviews.map((interview) => (
              <InterviewCard key={interview._id} interview={interview} user={user} />
            ))
          )}
        </div>
      )}
    </section>
  </div>
</div>

  );
};

export default Home;


