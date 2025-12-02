import Sidebar from '../components/layout/Sidebar';
import PostList from '../components/post/PostList';
import RightSidebar from '../components/layout/RightSidebar';
import '../styles/CommunityPage.css';

const PopularPage = ({ onAuthAction, isSidebarCollapsed, onToggleSidebar }) => {
  return (
    <div className="page-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={onToggleSidebar} />
      
      <div className="page-content-wrapper">
        <div className="page-content">
          <div className="page-main-area">
            <main className="page-main-content">
              <h2 style={{ marginBottom: '16px' }}>Popular Posts</h2>
              <PostList sortBy="top" onAuthRequired={onAuthAction} />
            </main>
            <div className="desktop-only page-right-sidebar">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularPage;