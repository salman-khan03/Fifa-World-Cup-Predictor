import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/index.jsx';
import './index.scss';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}