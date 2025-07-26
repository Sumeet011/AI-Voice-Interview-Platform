import React, { useState } from 'react';

// Main App component for the Create Interview page
const CreateInterview = () => {
  // State variables for all form fields
  const [interviewTitle, setInterviewTitle] = useState('');
  const [interviewType, setInterviewType] = useState(''); // Stores selected type from dropdown
  const [jobRole, setJobRole] = useState('');
  const [difficulty, setDifficulty] = useState(''); // Stores selected difficulty from dropdown
  const [keySkills, setKeySkills] = useState(''); // Comma-separated skills
  const [interviewDuration, setInterviewDuration] = useState(''); // Stores selected duration from dropdown
  const [description, setDescription] = useState('');
  const [publishSetting, setPublishSetting] = useState('Private'); // New state for publish setting, default to Private

  // Handler for form submission
  const handleCreateInterview = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to create an interview.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          interviewTitle,
          interviewType,
          jobRole,
          difficulty,
          keySkills,
          interviewDuration,
          description,
          publishSetting,
        }),
      });
      if (res.ok) {
        alert('New Interview Created!');
        setInterviewTitle('');
        setInterviewType('');
        setJobRole('');
        setDifficulty('');
        setKeySkills('');
        setInterviewDuration('');
        setDescription('');
        setPublishSetting('Private');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to create interview');
      }
    } catch {
      alert('Network error. Could not create interview.');
    }
  };

  // Handler for navigating back (for demonstration purposes)
  const handleGoBack = () => {
    alert('Navigating back to Dashboard!'); // Replace with actual routing logic (e.g., history.back() or react-router-dom)
  };

  return (
    // Main container for the entire page with a dark, subtle background
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans relative overflow-hidden">
      {/* Background subtle light elements for visual interest */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Create Interview card container */}
      <div className="relative bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg backdrop-filter backdrop-blur-lg bg-opacity-70 border border-gray-700">
        {/* Header with back button and title */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleGoBack}
            className="text-gray-400 hover:text-white transition duration-150 ease-in-out flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back
          </button>
          <h2 className="text-2xl font-bold text-white text-center flex-grow">
            Create New Interview
          </h2>
          <div className="w-16"></div> {/* Spacer for alignment */}
        </div>

        <p className="text-gray-400 text-center mb-8 text-sm">
          Define the parameters for your AI-powered practice interview.
        </p>

        {/* Create Interview Form */}
        <form onSubmit={handleCreateInterview} className="space-y-5">
          {/* Interview Title */}
          <div>
            <label htmlFor="interviewTitle" className="block text-sm font-medium text-gray-300 mb-1">
              Interview Title
            </label>
            <input
              type="text"
              id="interviewTitle"
              name="interviewTitle"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="e.g., Senior Frontend React Interview"
              value={interviewTitle}
              onChange={(e) => setInterviewTitle(e.target.value)}
            />
          </div>

          {/* Interview Type Dropdown */}
          <div>
            <label htmlFor="interviewType" className="block text-sm font-medium text-gray-300 mb-1">
              Interview Type
            </label>
            <select
              id="interviewType"
              name="interviewType"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out appearance-none pr-8"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
            >
              <option value="" disabled className="text-gray-500 bg-gray-700">Select Type</option>
              <option value="Technical" className="bg-gray-700">Technical</option>
              <option value="Behavioral" className="bg-gray-700">Behavioral</option>
              <option value="System Design" className="bg-gray-700">System Design</option>
              <option value="Product Management" className="bg-gray-700">Product Management</option>
              <option value="Data Science" className="bg-gray-700">Data Science</option>
            </select>
            {/* Custom arrow for select dropdown */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 mt-8">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
            </div>
          </div>

          {/* Job Role */}
          <div>
            <label htmlFor="jobRole" className="block text-sm font-medium text-gray-300 mb-1">
              Target Job Role
            </label>
            <input
              type="text"
              id="jobRole"
              name="jobRole"
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="e.g., Software Engineer, Product Manager"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            />
          </div>

          {/* Difficulty Level Dropdown */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-300 mb-1">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              name="difficulty"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out appearance-none pr-8"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="" disabled className="text-gray-500 bg-gray-700">Select Difficulty</option>
              <option value="Easy" className="bg-gray-700">Easy</option>
              <option value="Medium" className="bg-gray-700">Medium</option>
              <option value="Hard" className="bg-gray-700">Hard</option>
            </select>
            {/* Custom arrow for select dropdown */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 mt-8">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
            </div>
          </div>

          {/* Key Skills Textarea */}
          <div>
            <label htmlFor="keySkills" className="block text-sm font-medium text-gray-300 mb-1">
              Key Skills (comma-separated)
            </label>
            <textarea
              id="keySkills"
              name="keySkills"
              rows="3"
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out resize-y"
              placeholder="e.g., React, JavaScript, Node.js, Algorithms"
              value={keySkills}
              onChange={(e) => setKeySkills(e.target.value)}
            ></textarea>
          </div>

          {/* Interview Duration Dropdown */}
          <div>
            <label htmlFor="interviewDuration" className="block text-sm font-medium text-gray-300 mb-1">
              Interview Duration
            </label>
            <select
              id="interviewDuration"
              name="interviewDuration"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out appearance-none pr-8"
              value={interviewDuration}
              onChange={(e) => setInterviewDuration(e.target.value)}
            >
              <option value="" disabled className="text-gray-500 bg-gray-700">Select Duration</option>
              <option value="15" className="bg-gray-700">15 Minutes</option>
              <option value="30" className="bg-gray-700">30 Minutes</option>
              <option value="45" className="bg-gray-700">45 Minutes</option>
              <option value="60" className="bg-gray-700">60 Minutes</option>
              <option value="90" className="bg-gray-700">90 Minutes</option>
            </select>
            {/* Custom arrow for select dropdown */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 mt-8">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
            </div>
          </div>

          {/* Publish Setting Dropdown */}
          <div>
            <label htmlFor="publishSetting" className="block text-sm font-medium text-gray-300 mb-1">
              Publish Setting
            </label>
            <select
              id="publishSetting"
              name="publishSetting"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out appearance-none pr-8"
              value={publishSetting}
              onChange={(e) => setPublishSetting(e.target.value)}
            >
              <option value="Private" className="bg-gray-700">Private (Only you can see)</option>
              <option value="Public" className="bg-gray-700">Public (Share with others)</option>
            </select>
            {/* Custom arrow for select dropdown */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 mt-8">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
            </div>
          </div>

          {/* Description/Notes Textarea */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out resize-y"
              placeholder="Add any specific instructions or notes for this interview..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Create Interview Button */}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5"
            >
              Create Interview
            </button>
          </div>
        </form>
      </div>

      {/* Tailwind CSS animation keyframes for blob effect */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite cubic-bezier(0.6, 0.01, 0.3, 0.9);
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default CreateInterview;
