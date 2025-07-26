import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import Login from './Pages/Login.jsx'
import SignUp from './Pages/SignUp.jsx'
import Home from './Pages/Home.jsx'
import CreateInterview from './Pages/CreateInterview.jsx'
import Profile from './Pages/Profile.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/login' element={<Login />} />
        <Route path='/home' element={<Home />} />
        <Route path='/create-interview' element={<CreateInterview />} />
        <Route path='/profile' element={<Profile />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
