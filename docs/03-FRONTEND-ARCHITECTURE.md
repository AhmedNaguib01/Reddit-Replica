# Frontend Architecture Document

## Framework & Technology Choices

### React 19 - Why This Choice?
- **Latest Features**: Concurrent rendering, automatic batching
- **Performance**: React Compiler for automatic optimization
- **Ecosystem**: Vast library of components and tools
- **Developer Experience**: Hot module replacement, DevTools
- **Community**: Large community, extensive documentation

### Vite 7 - Build Tool
- **Fast HMR**: Instant hot module replacement
- **ES Modules**: Native ESM support for faster dev server
- **Optimized Builds**: Rollup-based production builds
- **Plugin Ecosystem**: Rich plugin system
- **TypeScript Support**: Built-in TypeScript support (not used in this project)

### Why Not Next.js or Other Frameworks?
- **Simplicity**: SPA architecture sufficient for this use case
- **Learning**: Focus on React fundamentals
- **Deployment**: Easier deployment to Vercel as static site
- **Control**: Full control over routing and state management

## Routing Structure

### React Router DOM 7.9.4

```jsx
<Routes>
  {/* Home & Feed */}
  <Route path="/" element={<HomePage />} />
  <Route path="/r/popular" element={<PopularPage />} />
  
  {/* Community */}
  <Route path="/r/:subreddit" element={<CommunityPage />} />
  <Route path="/communities" element={<AllCommunitiesPage />} />
  <Route path="/manage-communities" element={<ManageCommunitiesPage />} />
  
  {/* Posts */}
  <Route path="/post/:postId" element={<PostDetailPage />} />
  <Route path="/saved" element={<SavedPostsPage />} />
  
  {/* User */}
  <Route path="/user/:username" element={<UserProfilePage />} />
  <Route path="/u/:username" element={<UserProfilePage />} />
  
  {/* Features */}
  <Route path="/search" element={<SearchResultsPage />} />
  <Route path="/explore" element={<ExplorePage />} />
  <Route path="/feed/:feedId" element={<CustomFeedPage />} />
  <Route path="/chat" element={<ChatPage />} />
  
  {/* Auth */}
  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
  
  {/* Static Pages */}
  <Route path="/about" element={<AboutPage />} />
  <Route path="/help" element={<HelpPage />} />
  <Route path="/blog" element={<BlogPage />} />
  <Route path="/careers" element={<CareersPage />} />
  <Route path="/rules" element={<RulesPage />} />
  <Route path="/privacy" element={<PrivacyPage />} />
  <Route path="/user-agreement" element={<UserAgreementPage />} />
</Routes>
```

### Route Patterns

#### Dynamic Routes
- `/r/:subreddit` - Community pages (e.g., `/r/programming`)
- `/post/:postId` - Post detail pages
- `/user/:username` or `/u/:username` - User profiles
- `/feed/:feedId` - Custom feed pages
- `/reset-password/:token` - Password reset with token

#### Protected Routes
Routes that require authentication are handled via `onAuthAction` callback:
```jsx
// In HomePage.jsx
const handleCreatePost = () => {
  if (!currentUser) {
    onAuthAction(); // Opens login modal
    return;
  }
  // Proceed with post creation
};
```

## State Management

### Context API Architecture

The application uses React Context API for global state management. No Redux or external state libraries are used.

```
┌─────────────────────────────────────────────────────────────┐
│                      App Component                           │
├─────────────────────────────────────────────────────────────┤
│  <AuthProvider>                                              │
│    <ChatProvider>                                            │
│      <SidebarProvider>                                       │
│        <ToastProvider>                                       │
│          <LoadingProvider>                                   │
│            <Router>                                          │
│              {/* App content */}                             │
│            </Router>                                         │
│          </LoadingProvider>                                  │
│        </ToastProvider>                                      │
│      </SidebarProvider>                                      │
│    </ChatProvider>                                           │
│  </AuthProvider>                                             │
└─────────────────────────────────────────────────────────────┘
```

### Context Providers

#### 1. AuthContext - Authentication State
```jsx
// client/src/context/AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getCachedUser());
  const [loading, setLoading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('authToken', token);
    window.location.reload(); // Full reload to reset state
  };

  const logout = async () => {
    localStorage.removeItem('authToken');
    window.location.reload();
  };

  const updateUser = (userData) => {
    setCurrentUser(prev => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Features**:
- Cached user data in localStorage for instant load
- JWT token stored in localStorage
- Automatic auth check on mount
- Full page reload on login/logout to reset all state

#### 2. LoadingContext - Global Loading State
```jsx
// client/src/context/LoadingContext.jsx
const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const loadingCountRef = useRef(0);

  const startLoading = useCallback(() => {
    loadingCountRef.current += 1;
    if (loadingCountRef.current === 1) {
      setIsLoading(true);
    }
  }, []);

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setIsLoading(false);
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};
```

**Features**:
- Reference counting for multiple simultaneous requests
- Prevents loading bar flicker
- Used by LoadingBar component in header

#### 3. ToastContext - Notifications
```jsx
// client/src/context/ToastContext.jsx
const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};
```

**Features**:
- Auto-dismiss after 3 seconds
- Multiple toast types (success, error, info)
- Stack multiple toasts

#### 4. ChatContext - Chat State
```jsx
// client/src/context/ChatContext.jsx
const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [chats, setChats] = useState([]);

  const fetchUnreadCount = async () => {
    const data = await chatsAPI.getUnreadCount();
    setUnreadCount(data.unreadCount);
  };

  return (
    <ChatContext.Provider value={{ unreadCount, chats, fetchUnreadCount }}>
      {children}
    </ChatContext.Provider>
  );
};
```

**Features**:
- Unread message count for header badge
- Chat list caching
- Refresh on new messages

#### 5. SidebarContext - UI State
```jsx
// client/src/context/SidebarContext.jsx
const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
```

**Features**:
- Sidebar collapse state
- Persisted in localStorage
- Responsive behavior

### Local Component State

For component-specific state, standard `useState` and `useReducer` hooks are used:

```jsx
// Example: PostCard component
const PostCard = ({ post }) => {
  const [voteCount, setVoteCount] = useState(post.voteCount);
  const [userVote, setUserVote] = useState(post.userVote);
  const [saved, setSaved] = useState(post.saved);

  const handleVote = async (voteType) => {
    // Optimistic update
    setUserVote(voteType);
    setVoteCount(prev => prev + (voteType === 'up' ? 1 : -1));
    
    try {
      const data = await postsAPI.vote(post.id, voteType);
      setVoteCount(data.voteCount);
      setUserVote(data.userVote);
    } catch (error) {
      // Revert on error
      setUserVote(post.userVote);
      setVoteCount(post.voteCount);
    }
  };
};
```

## Data Fetching Strategy

### API Service Layer

All API calls are centralized in `client/src/services/api.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

// Example API module
export const postsAPI = {
  getAll: (subreddit) => apiRequest(`/posts${subreddit ? `?subreddit=${subreddit}` : ''}`),
  getById: (id) => apiRequest(`/posts/${id}`),
  create: (postData) => apiRequest('/posts', { method: 'POST', body: JSON.stringify(postData) }),
  vote: (postId, voteType) => apiRequest(`/posts/${postId}/vote`, { 
    method: 'POST', 
    body: JSON.stringify({ vote: voteType }) 
  }),
};
```

### Client-Side Caching

#### Request Deduplication
Prevents multiple simultaneous calls to the same endpoint:

```javascript
const pendingRequests = new Map();

const apiRequest = async (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const requestKey = method === 'GET' ? `${method}:${endpoint}` : null;
  
  // Return existing promise if request is pending
  if (requestKey && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  const requestPromise = fetch(/* ... */);
  
  if (requestKey) {
    pendingRequests.set(requestKey, requestPromise);
  }
  
  return requestPromise.finally(() => {
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }
  });
};
```

#### Data Caching
Short-term caching for frequently accessed data:

```javascript
let allPostsCache = null;
let allPostsCacheTimestamp = 0;
const CACHE_DURATION = 30 * 1000; // 30 seconds

export const postsAPI = {
  getAll: async (subreddit) => {
    if (!subreddit) {
      const now = Date.now();
      if (allPostsCache && (now - allPostsCacheTimestamp) < CACHE_DURATION) {
        return allPostsCache; // Return cached data
      }
      const data = await apiRequest('/posts');
      allPostsCache = data;
      allPostsCacheTimestamp = now;
      return data;
    }
    return apiRequest(`/posts?subreddit=${subreddit}`);
  },
  
  invalidateCache: () => {
    allPostsCache = null;
    allPostsCacheTimestamp = 0;
  },
};
```

### Data Fetching Patterns

#### 1. Fetch on Mount
```jsx
const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await postsAPI.getAll();
        setPosts(data);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) return <LoadingSpinner />;
  return <PostList posts={posts} />;
};
```

#### 2. Optimistic Updates
```jsx
const handleVote = async (voteType) => {
  // Update UI immediately
  setUserVote(voteType);
  setVoteCount(prev => prev + 1);
  
  try {
    // Confirm with server
    const data = await postsAPI.vote(postId, voteType);
    setVoteCount(data.voteCount);
  } catch (error) {
    // Revert on error
    setUserVote(null);
    setVoteCount(prev => prev - 1);
    showToast('Failed to vote', 'error');
  }
};
```

#### 3. Polling (Chat)
```jsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchUnreadCount();
  }, 30000); // Poll every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

## Infinite Scrolling & Pagination

### Current Implementation
**Status**: ❌ Not implemented

All posts and comments are loaded at once with a limit:
```javascript
// Backend: server/routes/posts.js
const posts = await Post.find(query)
  .sort({ createdAt: -1 })
  .limit(50) // Hard limit
  .lean();
```

### Recommended Implementation

#### Cursor-Based Pagination
```javascript
// API Service
export const postsAPI = {
  getAll: async (cursor = null, limit = 20) => {
    const query = cursor ? `?cursor=${cursor}&limit=${limit}` : `?limit=${limit}`;
    return apiRequest(`/posts${query}`);
  },
};

// Component
const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    const data = await postsAPI.getAll(cursor);
    setPosts(prev => [...prev, ...data.posts]);
    setCursor(data.nextCursor);
    setHasMore(data.hasMore);
  };

  return (
    <InfiniteScroll
      dataLength={posts.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<LoadingSpinner />}
    >
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </InfiniteScroll>
  );
};
```

## Markdown & Rich Text Handling

### Current Implementation
**Status**: ⚠️ Basic text only

Posts and comments support plain text with line breaks preserved:
```jsx
// Display content with line breaks
<p style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
```

### Recommended Enhancement

#### Markdown Support
```bash
npm install react-markdown remark-gfm
```

```jsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PostContent = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom renderers
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        code: ({ inline, children }) => (
          inline ? <code>{children}</code> : <pre><code>{children}</code></pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

#### Rich Text Editor
```bash
npm install @tiptap/react @tiptap/starter-kit
```

```jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const RichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return <EditorContent editor={editor} />;
};
```

## Component Architecture

### Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── SearchBar
│   ├── UserMenu
│   └── NotificationBell
├── Sidebar
│   ├── CommunityList
│   ├── CustomFeedList
│   └── QuickLinks
└── Page (Route-specific)
    ├── HomePage
    │   ├── CreatePostButton
    │   ├── FeedFilter
    │   └── PostList
    │       └── PostCard (repeated)
    │           ├── VoteButtons
    │           ├── PostContent
    │           ├── PostActions
    │           └── CommentCount
    ├── PostDetailPage
    │   ├── PostCard
    │   ├── CommentForm
    │   └── CommentTree
    │       └── CommentItem (recursive)
    │           ├── VoteButtons
    │           ├── CommentContent
    │           ├── ReplyButton
    │           └── CommentTree (nested)
    └── UserProfilePage
        ├── ProfileHeader
        ├── ProfileTabs
        ├── PostList
        └── CommentList
```

### Component Patterns

#### 1. Container/Presentational Pattern
```jsx
// Container (smart component)
const PostListContainer = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  return <PostList posts={posts} loading={loading} />;
};

// Presentational (dumb component)
const PostList = ({ posts, loading }) => {
  if (loading) return <LoadingSpinner />;
  return posts.map(post => <PostCard key={post.id} post={post} />);
};
```

#### 2. Compound Components
```jsx
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

Modal.Header = ({ children }) => <div className="modal-header">{children}</div>;
Modal.Body = ({ children }) => <div className="modal-body">{children}</div>;
Modal.Footer = ({ children }) => <div className="modal-footer">{children}</div>;

// Usage
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>Actions</Modal.Footer>
</Modal>
```

#### 3. Render Props
```jsx
const DataFetcher = ({ url, render }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url).then(res => res.json()).then(setData).finally(() => setLoading(false));
  }, [url]);

  return render({ data, loading });
};

// Usage
<DataFetcher
  url="/api/posts"
  render={({ data, loading }) => (
    loading ? <LoadingSpinner /> : <PostList posts={data} />
  )}
/>
```

## Performance Optimizations

### 1. React.memo for Expensive Components
```jsx
const PostCard = React.memo(({ post, onVote }) => {
  return (
    <div className="post-card">
      {/* Post content */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.voteCount === nextProps.post.voteCount;
});
```

### 2. useMemo for Expensive Calculations
```jsx
const CommentTree = ({ comments }) => {
  const sortedComments = useMemo(() => {
    return comments.sort((a, b) => b.voteCount - a.voteCount);
  }, [comments]);

  return sortedComments.map(comment => <CommentItem key={comment.id} comment={comment} />);
};
```

### 3. useCallback for Stable Function References
```jsx
const PostList = ({ posts }) => {
  const handleVote = useCallback((postId, voteType) => {
    postsAPI.vote(postId, voteType);
  }, []);

  return posts.map(post => (
    <PostCard key={post.id} post={post} onVote={handleVote} />
  ));
};
```

### 4. Code Splitting with React.lazy
```jsx
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/user/:username" element={<UserProfilePage />} />
  </Routes>
</Suspense>
```

### 5. Virtual Scrolling (Recommended)
```bash
npm install react-window
```

```jsx
import { FixedSizeList } from 'react-window';

const PostList = ({ posts }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PostCard post={posts[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={800}
      itemCount={posts.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

## Styling Architecture

### CSS Variables for Theming
```css
/* global.css */
:root {
  --color-primary: #ff4500;
  --color-background: #ffffff;
  --color-text: #1c1c1c;
  --color-border: #ccc;
}

.dark-mode {
  --color-background: #1a1a1b;
  --color-text: #d7dadc;
  --color-border: #343536;
}

.button {
  background-color: var(--color-primary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

### Component-Scoped Styles
Each component has its styles defined inline or in a separate CSS file:

```jsx
// PostCard.jsx
const PostCard = ({ post }) => {
  return (
    <div className="post-card">
      <div className="post-header">
        <span className="post-author">{post.author}</span>
        <span className="post-time">{post.timeAgo}</span>
      </div>
      <h2 className="post-title">{post.title}</h2>
      <p className="post-content">{post.content}</p>
    </div>
  );
};
```

### Responsive Design
```css
/* Mobile-first approach */
.sidebar {
  display: none;
}

@media (min-width: 768px) {
  .sidebar {
    display: block;
    width: 250px;
  }
}

@media (min-width: 1024px) {
  .sidebar {
    width: 300px;
  }
}
```

## Error Handling

### Error Boundaries
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### API Error Handling
```jsx
const fetchPosts = async () => {
  try {
    const data = await postsAPI.getAll();
    setPosts(data);
  } catch (error) {
    if (error.message === 'Unauthorized') {
      logout();
    } else {
      showToast(error.message || 'Failed to load posts', 'error');
    }
  }
};
```

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintainer**: Ahmed Mohamed Naguib
