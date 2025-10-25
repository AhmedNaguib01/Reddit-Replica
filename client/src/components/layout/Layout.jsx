import React from 'react';
import { Navbar } from './Navbar';
import '../../styles/components.css';

export const Layout = ({ children, setPage, allCommunities, handleSearch }) => {
  return (
    <div className="app-root">
      <Navbar setPage={setPage} allCommunities={allCommunities} handleSearch={handleSearch} />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
};