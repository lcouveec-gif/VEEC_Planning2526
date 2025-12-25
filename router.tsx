import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Pages (lazy loading pour optimisation)
import ScheduleGrid from './components/ScheduleGrid';
import MatchSchedule from './components/MatchSchedule';
import PositionTracker from './components/PositionTracker';
import TeamView from './components/TeamView';
import Admin from './components/Admin';
import Referee from './components/Referee';
import AIChat from './components/AIChat';
import TrainingPage from './pages/TrainingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/team" replace />
      },
      {
        path: 'training',
        element: <TrainingPage />
      },
      {
        path: 'matches',
        element: <MatchSchedule />
      },
      {
        path: 'matches/:teamId',
        element: <MatchSchedule />
      },
      {
        path: 'position',
        element: <PositionTracker />
      },
      {
        path: 'position/:teamId',
        element: <PositionTracker />
      },
      {
        path: 'team',
        element: <TeamView />
      },
      {
        path: 'referee',
        element: <Referee />
      },
      {
        path: 'ai',
        element: <AIChat />
      },
      {
        path: 'admin',
        element: <Admin />
      },
      {
        path: 'admin/:section',
        element: <Admin />
      },
      {
        path: 'admin/:section/:teamId',
        element: <Admin />
      },
      {
        path: '*',
        element: <Navigate to="/team" replace />
      }
    ]
  }
]);
