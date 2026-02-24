import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import MovieDetails from "./pages/movie-details/MovieDetailsPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/profile/ProfilePage";
import Watchlist from "./pages/Watchlist";
import Admin from "./pages/admin/AdminPage";

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-dark-bg flex flex-col">
          <Navbar />
          <main className="flex-1">
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/movie/:id" element={<MovieDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<div className="p-8 text-center text-white">404 - Page Not Found</div>} />
            </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;