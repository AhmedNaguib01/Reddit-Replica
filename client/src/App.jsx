import React, { useState } from 'react';
// Import context
import { AuthProvider } from './context/AuthContext';
// Import layout
import { Layout } from './components/layout/Layout';
// Import mock data
import { DB_USERS, DB_COMMUNITIES, DB_POSTS, DB_COMMENTS } from './data/mockData';
// Import ALL your pages (using default imports)
import HomePage from './pages/HomePage';
import CommunityPage from './pages/CommunityPage';
import PostDetailPage from './pages/PostDetailPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage'
import CreatePostPage from './pages/CreatePostPage';
import CreateCommunityPage from './pages/CreateCommunityPage';
import SearchResultsPage from './pages/SearchResultsPage';
// (You'll also need to split all the other components)

export default function App() {
  // === TOP LEVEL STATE (Simulates your database) ===
  const [db, setDb] = useState({
    users: DB_USERS,
    communities: DB_COMMUNITIES,
    posts: DB_POSTS,
    comments: DB_COMMENTS,
  });

  // This simulates our router.
  // page = { name: 'home' }
  // page = { name: 'community', id: 'c1' }
  // page = { name: 'post', id: 'p2' }
  const [page, setPage] = useState({ name: 'home' });

  // === DATABASE "WRITE" FUNCTIONS (Would be API calls) ===

  // Requirement #8: Upvoting/Downvoting
  const handleVote = (id, direction, isComment = false) => {
    const dbKey = isComment ? 'comments' : 'posts';
    
    setDb(prevDb => {
      const item = prevDb[dbKey][id];
      if (!item) return prevDb;

      const newVotes = item.votes + (direction === 'up' ? 1 : -1);
      const updatedItem = { ...item, votes: newVotes };
      
      return {
        ...prevDb,
        [dbKey]: {
          ...prevDb[dbKey],
          [id]: updatedItem
        }
      };
    });
  };

  // Requirement #5: Creating a post
  const handleCreatePost = (postData) => {
    const newId = "p" + (Object.keys(db.posts).length + 1);
    const newPost = {
      ...postData,
      id: newId,
      votes: 1,
      created: new Date().toISOString()
    };
    
    setDb(prevDb => ({
      ...prevDb,
      posts: {
        ...prevDb.posts,
        [newId]: newPost
      }
    }));
    
    // Navigate to the new post
    setPage({ name: 'post', id: newId });
  };
  
  // Requirement #9: Commenting
  const handleCreateComment = (commentData) => {
    const newId = "c" + (Object.keys(db.comments).length + 1);
    const newComment = {
      ...commentData,
      id: newId,
      votes: 1,
      created: new Date().toISOString()
    };
    
    setDb(prevDb => ({
      ...prevDb,
      comments: {
        ...prevDb.comments,
        [newId]: newComment
      }
    }));
  };
  
  // Requirement #3: Creating a community
  const handleCreateCommunity = (communityData) => {
    const newId = "c" + (Object.keys(db.communities).length + 1);
    const newCommunity = {
      ...communityData,
      id: newId,
      name: communityData.name.replace(/ /g, '_'),
      members: 1,
    };
    
    setDb(prevDb => ({
      ...prevDb,
      communities: {
        ...prevDb.communities,
        [newId]: newCommunity
      }
    }));
    
    setPage({ name: 'community', id: newId });
  };
  
  // Requirement #4: Joining/Leaving
  const handleJoinLeave = (communityId) => {
    // This is just faked for the demo.
    setDb(prevDb => {
      const community = prevDb.communities[communityId];
      const isMember = community.members % 2 === 0;
      const newMemberCount = isMember ? community.members - 1 : community.members + 1;
      
      return {
        ...prevDb,
        communities: {
          ...prevDb.communities,
          [communityId]: { ...community, members: newMemberCount }
        }
      };
    });
    alert(db.communities[communityId].members % 2 !== 0 ? "Joined r/" + db.communities[communityId].name : "Left r/" + db.communities[communityId].name);
  };
  
  // Requirement #10: Searching
  const handleSearch = (query) => {
    setPage({ name: 'search', query });
  };

  // === ROUTER (Renders the correct page) ===
  const renderPage = () => {
    // Gather all props to pass to pages
    const pageProps = {
      allUsers: db.users,
      allCommunities: db.communities,
      allPosts: db.posts,
      allComments: db.comments,
      setPage,
      handleVote,
      handleCreatePost,
      handleCreateComment,
      handleCreateCommunity,
      handleJoinLeave,
    };

    switch (page.name) {
      case 'home':
        return <HomePage {...pageProps} />;
      case 'community':
        return <CommunityPage communityId={page.id} {...pageProps} />;
      case 'post':
        return <PostDetailPage postId={page.id} {...pageProps} />;
      case 'profile':
        return <ProfilePage userId={page.id} {...pageProps} />;
      case 'login':
        return <LoginPage isRegister={page.register} setPage={setPage} />;
      case 'create-post':
        return <CreatePostPage {...pageProps} />;
      case 'create-community':
        return <CreateCommunityPage {...pageProps} />;
      case 'search':
        return <SearchResultsPage query={page.query} {...pageProps} />;
      default:
        return <h2>404 Page Not Found</h2>;
    }
  };
  
  // We pass users/setUsers from the db state to AuthProvider
  const setUsers = (userUpdater) => {
     setDb(prevDb => ({
       ...prevDb,
       users: userUpdater(prevDb.users)
     }));
  };

  return (
    <AuthProvider users={db.users} setUsers={setUsers}>
      <Layout 
        setPage={setPage} 
        allCommunities={db.communities}
        handleSearch={handleSearch}
      >
        {renderPage()}
      </Layout>
    </AuthProvider>
  );
}