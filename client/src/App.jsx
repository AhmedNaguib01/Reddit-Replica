import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// The home page is what almost every visit lands on, so it ships in the initial
// bundle. Every other route is fetched on demand - this keeps the first load
// from carrying the chat client, the static content pages and every modal.
import HomePage from './pages/HomePage';

const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const PopularPage = lazy(() => import('./pages/PopularPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const ManageCommunitiesPage = lazy(() => import('./pages/ManageCommunitiesPage'));
const AllCommunitiesPage = lazy(() => import('./pages/AllCommunitiesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const UserAgreementPage = lazy(() => import('./pages/UserAgreementPage'));
const SavedPostsPage = lazy(() => import('./pages/SavedPostsPage'));
const CustomFeedPage = lazy(() => import('./pages/CustomFeedPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Only mounted once the user actually opens it, and it pulls in the Google
// sign-in flow with it
const LoginModal = lazy(() => import('./components/auth/LoginModal'));

import Header from './components/layout/Header';
import LoadingBar from './components/layout/LoadingBar';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoadingProvider } from './context/LoadingContext';
import { SidebarProvider } from './context/SidebarContext';
import { ChatProvider } from './context/ChatContext';
import './styles/global.css';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Default to collapsed on mobile (< 768px)
    const isMobile = window.innerWidth < 768;
    if (isMobile) return true;
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Handle window resize to auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <ChatProvider>
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

          <Suspense fallback={<div className="route-loading" />}>
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
            <Route path="/user-agreement" element={<UserAgreementPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/saved" element={<SavedPostsPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/feed/:feedId" element={<CustomFeedPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/chat" element={<ChatPage isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/r/:subreddit" element={<CommunityPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/user/:username" element={<UserProfilePage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/u/:username" element={<UserProfilePage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
            <Route path="/post/:postId" element={<PostDetailPage onAuthAction={openLogin} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} />} />
          </Routes>
          </Suspense>

            {isLoginOpen && (
              <Suspense fallback={null}>
                <LoginModal isOpen={isLoginOpen} onClose={closeLogin} />
              </Suspense>
            )}
            </div>
            </Router>
            </LoadingProvider>
          </ToastProvider>
        </SidebarProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;