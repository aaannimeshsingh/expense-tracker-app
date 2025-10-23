import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, PlusCircle, BarChart2, LogOut, X, Menu, DollarSign, Target, Brain, Plug } from 'lucide-react'; // Added Plug icon

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const NavItems = [
    { name: 'Dashboard', icon: Home, path: '/' },
    { name: 'Add Expense', icon: PlusCircle, path: '/add-expense' },
    { name: 'Budgets', icon: Target, path: '/budgets' },
    { name: 'AI Insights', icon: Brain, path: '/insights' },
    { name: 'Reports', icon: BarChart2, path: '/reports' },
    { name: 'Integrations', icon: Plug, path: '/integrations' }, // 🆕 ADD THIS LINE
  ];

  const baseClasses = "flex items-center p-3 rounded-lg text-white transition duration-200 ease-in-out hover:bg-indigo-700/80";
  const activeClasses = "bg-indigo-700 shadow-md";

  const renderContent = (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      <div className="p-6 text-center border-b border-gray-700/50">
        <div className="flex items-center justify-center space-x-2 text-2xl font-bold text-indigo-400">
          <DollarSign className="w-7 h-7" />
          <span>Tracker AI</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {NavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : 'bg-gray-800'}`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700/50">
        {user && (
          <div className="mb-3 p-2 text-sm bg-gray-700 rounded-lg truncate">
            <p className="font-medium text-indigo-300">Logged in:</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={`${baseClasses} w-full justify-center bg-red-600 hover:bg-red-700`}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Log Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-indigo-600 text-white rounded-lg md:hidden shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Sidebar (Slide-over menu) */}
      <div
        className={`fixed inset-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden transition-transform duration-300 ease-in-out`}
      >
        <div className="w-64 h-full bg-gray-800 shadow-2xl relative">
          {renderContent}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full bg-gray-700 text-white hover:bg-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1" onClick={() => setIsOpen(false)}></div>
      </div>

      {/* Desktop Sidebar (Always visible) */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-gray-800 shadow-2xl">
        {renderContent}
      </aside>
    </>
  );
};

export default Sidebar;