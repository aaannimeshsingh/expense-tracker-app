import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import Navbar from './Navbar'; 

const Layout = () => {
  return (
    // The main container sets the height to 100vh and uses flex layout
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Sidebar Component */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar Component */}
        <Navbar />
        
        {/* Page Content (Dynamic, loaded via Router) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          <Outlet /> {/* Renders the current page component based on the URL */}
        </main>
      </div>
    </div>
  );
};

export default Layout;