import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Watchlist from "./pages/Watchlist";
import { authApi } from "./api/movies";
import { useApp } from "./context/AppContext";

function App() {
  const { theme } = useApp();

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));
  const [username, setUsername] = useState<string | undefined>(() => {
    return localStorage.getItem("username") || undefined;
  });

  // ✅ Verify token once on app start (better than trusting localStorage)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    authApi
      .getCurrentUser()
      .then((me) => {
        setIsLoggedIn(true);
        const name = me?.name || localStorage.getItem("username") || "User";
        setUsername(name);
        localStorage.setItem("username", name);
      })
      .catch(() => {
        // invalid/expired token
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        setIsLoggedIn(false);
        setUsername(undefined);
      });
  }, []);

  const handleLogin = (token: string, name: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("username", name);
    setIsLoggedIn(true);
    setUsername(name);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername(undefined);
  };

  return (
    <BrowserRouter>
      <div
        className={`min-h-screen transition-colors ${
          theme === "dark" ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
        }`}
      >
        <Navbar isLoggedIn={isLoggedIn} username={username} onLogout={handleLogout} />

        <Routes>
          <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/watchlist" element={<Watchlist />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
