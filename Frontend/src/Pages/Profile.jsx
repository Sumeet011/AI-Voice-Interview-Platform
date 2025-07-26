import React, { useEffect, useState } from 'react';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('timeline');
    const [selectedResult, setSelectedResult] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const userData = await response.json();
                setUser(userData);
            } catch (error) {
                console.error('Error fetching user:', error);
            }
        };
        fetchUser();
    }, []);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
                <p>Loading user data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter">
            {/* Profile card container */}
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 max-w-5xl w-full transform transition-all duration-300 hover:scale-[1.005] hover:shadow-3xl border border-gray-700">

                {/* Top Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-start mb-8 space-y-6 md:space-y-0 md:space-x-8">
                    {/* Profile Picture */}
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-lg border-4 border-purple-500 flex-shrink-0">
                        <img
                            src={user.profilePicture || 'https://placehold.co/150x150/8B5CF6/ffffff?text=User'}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/150x150/374151/ffffff?text=JR"; }}
                        />
                    </div>

                    {/* User Info and Actions */}
                    <div className="flex-grow text-center md:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 sm:mb-0">
                                {user.name || 'No Name'}
                            </h1>
                            <div className="flex items-center text-gray-400 text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 1000-4 0z" clipRule="evenodd" />
                                </svg>
                                {user.location || 'Unknown'}
                                <span className="ml-4 text-purple-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <p className="text-lg text-purple-300 mb-4">{user.title || 'User'}</p>
                        {/* Action Buttons */}
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-0.5">
                                Send message
                            </button>
                            <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-0.5">
                                Contacts
                            </button>
                            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-0.5">
                                Report user
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs for Timeline and About */}
                <div className="flex border-b border-gray-700 mb-8">
                    <button
                        className={`py-3 px-6 text-lg font-semibold ${activeTab === 'timeline' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Timeline
                    </button>
                    <button
                        className={`py-3 px-6 text-lg font-semibold ${activeTab === 'about' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
                        onClick={() => setActiveTab('about')}
                    >
                        About
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'about' && (
                    <div className="space-y-8">
                        {/* Contact Information */}
                        <div className="bg-gray-700 rounded-xl p-6 shadow-inner border border-gray-600">
                            <h3 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                                <p><strong className="font-semibold text-purple-300">Phone:</strong> {user.phone || 'N/A'}</p>
                                <p><strong className="font-semibold text-purple-300">Email:</strong> {user.email}</p>
                                <p className="col-span-1 md:col-span-2"><strong className="font-semibold text-purple-300">Address:</strong> {user.address || 'N/A'}</p>
                                <p className="col-span-1 md:col-span-2"><strong className="font-semibold text-purple-300">Website:</strong> {user.website ? (<a href={`http://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{user.website}</a>) : 'N/A'}</p>
                            </div>
                        </div>
                        {/* Basic Information */}
                        <div className="bg-gray-700 rounded-xl p-6 shadow-inner border border-gray-600">
                            <h3 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                                <p><strong className="font-semibold text-purple-300">Birthday:</strong> {user.birthday || 'N/A'}</p>
                                <p><strong className="font-semibold text-purple-300">Gender:</strong> {user.gender || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="space-y-8">
                        {/* Work Experience */}
                        <div className="bg-gray-700 rounded-xl p-6 shadow-inner border border-gray-600">
                            <h3 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Work Experience</h3>
                            <div className="space-y-4">
                                {user.workExperience && user.workExperience.length > 0 ? (
                                    user.workExperience.map((work, idx) => (
                                        <div key={idx} className="bg-gray-800 rounded-lg p-4 shadow-md border border-gray-700">
                                            <p className="text-lg font-semibold text-purple-300">{work.company} <span className="text-gray-400 text-sm">({work.role})</span></p>
                                            <p className="text-gray-400 text-sm">{work.address}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400">No work experience listed.</p>
                                )}
                            </div>
                        </div>
                        {/* Skills Section */}
                        <div className="bg-gray-700 rounded-xl p-6 shadow-inner border border-gray-600">
                            <h3 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {user.skills && user.skills.length > 0 ? (
                                    user.skills.map((skill, idx) => (
                                        <span key={idx} className="bg-purple-600 text-white text-sm px-3 py-1 rounded-full shadow-sm">
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-gray-400">No skills listed.</p>
                                )}
                            </div>
                        </div>
                        {/* Interview Results section (renamed for context) */}
                        <div className="bg-gray-700 rounded-xl p-6 shadow-inner border border-gray-600">
                            <h3 className="text-2xl font-bold text-white mb-4 border-b border-gray-600 pb-2">Past Interview Insights</h3>
                            {user.aiGeneratedResults && user.aiGeneratedResults.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {user.aiGeneratedResults.map((result, idx) => (
                                        <div
                                            key={result._id || idx}
                                            className="bg-gray-800 rounded-xl p-6 shadow-md border border-gray-700 transform transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                                            onClick={() => setSelectedResult(result)}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="text-xl font-bold text-purple-400">
                                                    Score: <span className="text-white">{result.score}</span>
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {new Date(result.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <p className="text-gray-300 mb-2 leading-relaxed">
                                                <strong className="font-semibold text-white">Feedback:</strong> {result.feedback?.slice(0, 60) || 'No feedback'}{result.feedback && result.feedback.length > 60 ? '...' : ''}
                                            </p>
                                            <p className="text-gray-300 leading-relaxed">
                                                <strong className="font-semibold text-white">Recommendation:</strong> {result.recommendation}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 text-lg py-4">
                                    No interview results found.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Modal for detailed interview result */}
                {selectedResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-purple-500 relative">
                            <button
                                className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
                                onClick={() => setSelectedResult(null)}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                            <h2 className="text-2xl font-bold text-purple-400 mb-4">Interview Result Details</h2>
                            <div className="mb-2">
                                <span className="font-semibold text-white">Score:</span> <span className="text-purple-300">{selectedResult.score}</span>
                            </div>
                            <div className="mb-2">
                                <span className="font-semibold text-white">Feedback:</span> <span className="text-gray-200">{selectedResult.feedback}</span>
                            </div>
                            <div className="mb-2">
                                <span className="font-semibold text-white">Recommendation:</span> <span className="text-purple-300">{selectedResult.recommendation}</span>
                            </div>
                            <div className="mb-2">
                                <span className="font-semibold text-white">Date:</span> <span className="text-gray-400">{new Date(selectedResult.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
