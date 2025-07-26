import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Main Login component for the PrepWise account creation page
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handler for form submission
  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error');
    }
  };

  return (
    // Main container for the entire page with a dark, subtle background
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4 font-sans relative overflow-hidden">
      {/* Background subtle light elements for visual interest */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Account creation card container */}
      <div className="relative bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-filter backdrop-blur-lg bg-opacity-70 border border-gray-700">
        {/* PrepWise Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="https://placehold.co/120x40/333333/FFFFFF?text=PrepWise" // Placeholder for PrepWise logo
            alt="PrepWise Logo"
            className="h-10"
            onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/120x40/333333/FFFFFF?text=Logo+Error"; }}
          />
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Practice job interviews with AI
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Login to get started
        </p>
        {error && <div className="text-red-400 text-center mb-4">{error}</div>}
        {/* Account Creation Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="adrian@jsmastery.pro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg shadow-sm text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Create Account Button */}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5"
            >
              Login
            </button>
          </div>
        </form>

        {/* Already have an account link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
           Dont have an account?{' '}
            <a href="/signup" className="font-medium text-purple-400 hover:text-purple-300 transition duration-150 ease-in-out">
              Sign Up
            </a>
          </p>
        </div>
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

export default Login;
