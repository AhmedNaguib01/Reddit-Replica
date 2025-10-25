import React from 'react'; 

// We export each database object
export const DB_USERS = {
  "u1": { id: "u1", username: "demo_user", joined: "2024-10-25T10:00:00Z" },
  "u2": { id: "u2", username: "react_dev", joined: "2024-10-20T14:30:00Z" },
};

export const DB_COMMUNITIES = {
  "c1": { id: "c1", name: "reactjs", description: "All about React", members: 1024, createdBy: "u2" },
  "c2": { id: "c2", name: "webdev", description: "General web development news and questions.", members: 5012, createdBy: "u1" },
  "c3": { id: "c3", name: "ai_news", description: "The latest in AI.", members: 850, createdBy: "u2" },
};

export const DB_POSTS = {
  "p1": {
    id: "p1",
    title: "React 19 is amazing!",
    body: "I've been using the new features for a week and my mind is blown. The compiler is a game changer. What are your favorite new features?",
    authorId: "u2",
    communityId: "c1",
    votes: 127,
    created: "2024-10-25T11:00:00Z",
  },
  "p2": {
    id: "p2",
    title: "What's the best way to handle auth in 2025?",
    body: "Seems like there are a million options. I'm building a Node/Express/Postgres backend and a React frontend. What do you all recommend? Cookies? Tokens?",
    authorId: "u1",
    communityId: "c2",
    votes: 42,
    created: "2024-10-24T09:15:00Z",
  },
  "p3": {
    id: "p3",
    title: "This new AI model can write entire applications",
    body: "The rate of progress is just staggering. Saw a demo today where it generated a full-stack e-commerce site from a single prompt. It's both exciting and a little terrifying. How do we adapt as developers?",
    authorId: "u2",
    communityId: "c3",
    votes: 288,
    created: "2024-10-25T14:00:00Z",
  },
};

export const DB_COMMENTS = {
  "comment1": { id: "comment1", postId: "p1", authorId: "u1", body: "Totally agree! `use` hook is my favorite.", votes: 10, created: "2024-10-25T11:30:00Z" },
  "comment2": { id: "comment2", postId: "p2", authorId: "u2", body: "I'm a fan of HTTP-only cookies for web. Secure and simple.", votes: 8, created: "2024-10-24T10:00:00Z" },
  "comment3": { id: "comment3", postId: "p2", authorId: "u1", body: "Good point. I was leaning towards JWTs in localStorage but cookies seem safer.", votes: 3, created: "2024-10-24T10:05:00Z" },
  "comment4": { id: "comment4", postId: "p3", authorId: "u1", body: "It's a tool, not a replacement. It'll handle the boilerplate so we can focus on the hard problems.", votes: 15, created: "2024-10-25T14:15:00Z" },
};


export const recentLinks = [
  {
    name: 'r/TBIZL',
    icon: 'T',
    color: '#FF4500',
  },
  {
    name: 'r/reduvance',
    icon: 'R',
    color: '#0079D3',
  },
];
