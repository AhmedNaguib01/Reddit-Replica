import StaticPage from './StaticPage';

const AboutPage = ({ isSidebarCollapsed, onToggleSidebar }) => {
  return (
    <StaticPage 
      title="About Reddit" 
      isSidebarCollapsed={isSidebarCollapsed} 
      onToggleSidebar={onToggleSidebar}
    >
      <p>
        This is a Reddit Replica, a full-stack web application that recreates the core 
        functionality of Reddit, including communities, posts, comments, voting, and user profiles.
      </p>
      
      <h2>University Project</h2>
      <p>
        This project was developed as part of a Web Development course at 
        <strong> Ain Shams University</strong>, Faculty of Computer and Information Sciences.
      </p>
      
      <h2>Tech Stack</h2>
      <div className="highlight-box">
        <p><strong>Frontend:</strong> React 19, React Router, Vite</p>
        <p><strong>Backend:</strong> Node.js, Express, MongoDB</p>
        <p><strong>Deployment:</strong> Vercel (Frontend), Railway (Backend)</p>
      </div>
      
      <h2>Team Members</h2>
      <ul>
        <li>Ahmed Mohamed - Leader</li>
        <li>Omar Montaser</li>
        <li>Ferass Ahmed</li>
        <li>Omar Tarek</li>
        <li>Ahmed Elmahe</li>
        <li>Hisham Elhwary</li>
        <li>Mohamed Fotoh</li>
      </ul>
      
      <h2>Features</h2>
      <ul>
        <li>User authentication (register/login)</li>
        <li>Create and join communities</li>
        <li>Create posts (text & images)</li>
        <li>Upvote/downvote system</li>
        <li>Nested comments</li>
        <li>User profiles with karma</li>
        <li>Follow users</li>
        <li>Custom feeds</li>
        <li>Real-time notifications</li>
        <li>Dark mode</li>
      </ul>
    </StaticPage>
  );
};

export default AboutPage;
