// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';

// Placeholder pages
const MovieDetail = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Детайли за филма (TODO)</h1>
  </div>
);

const Login = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Вход (TODO)</h1>
  </div>
);

const Register = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Регистрация (TODO)</h1>
  </div>
);

const Watchlist = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Списък за гледане (TODO)</h1>
  </div>
);

const Recommendations = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Препоръки за теб (TODO)</h1>
  </div>
);

const Profile = () => (
  <div className="min-h-screen bg-gray-950 text-white p-8">
    <h1 className="text-2xl">Профил (TODO)</h1>
  </div>
);

function App() {
  // Initialize state directly from localStorage - no useEffect needed!
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('token');
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem('username') || undefined;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername(undefined);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950">
        <Navbar 
          isLoggedIn={isLoggedIn} 
          username={username}
          onLogout={handleLogout}
        />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;