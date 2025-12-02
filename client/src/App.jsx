import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CommunityPage from './pages/CommunityPage';
import PopularPage from './pages/PopularPage';
import UserProfilePage from './pages/UserProfilePage';
import PostDetailPage from './pages/PostDetailPage';
import ExplorePage from './pages/ExplorePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ManageCommunitiesPage from './pages/ManageCommunitiesPage';
import AllCommunitiesPage from './pages/AllCommunitiesPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import BlogPage from './pages/BlogPage';
import CareersPage from './pages/CareersPage';
import RulesPage from './pages/RulesPage';
import PrivacyPage from './pages/PrivacyPage';
import SavedPostsPage from './pages/SavedPostsPage';
import CustomFeedPage from './pages/CustomFeedPage';
import Header from './components/layout/Header';
import LoadingBar from './components/layout/LoadingBar';
import LoginModal from './components/auth/LoginModal';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoadingProvider } from './context/LoadingContext';
import { SidebarProvider } from './context/SidebarContext';
import './styles/global.css';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const openLogin = () => setIsLoginOpen(true);
  const closeLogin = () => setIsLoginOpen(false);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebarCollapsed', JSON.stringify(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  return (
    <AuthProvider>
      <SidebarProvider>
        <ToastProvider>
          <LoadingProvider>
            <Router>
            <div className="app">
            <Header 
              onLoginClick={openLogin} 
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <LoadingBar />

          <Routes>
            <Route path="/" element={<HomePage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/r/popular" element={<PopularPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/explore" element={<ExplorePage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/search" element={<SearchResultsPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/manage-communities" element={<ManageCommunitiesPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/communities" element={<AllCommunitiesPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/about" element={<AboutPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/help" element={<HelpPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/blog" element={<BlogPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/careers" element={<CareersPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/rules" element={<RulesPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/privacy" element={<PrivacyPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/saved" element={<SavedPostsPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/feed/:feedId" element={<CustomFeedPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/r/:subreddit" element={<CommunityPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/user/:username" element={<UserProfilePage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/u/:username" element={<UserProfilePage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/post/:postId" element={<PostDetailPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
          </Routes>

            <LoginModal isOpen={isLoginOpen} onClose={closeLogin} />
            </div>
            </Router>
          </LoadingProvider>
        </ToastProvider>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;