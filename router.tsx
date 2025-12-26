import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages (lazy loading pour optimisation)
import ScheduleGrid from './components/ScheduleGrid';
import MatchSchedule from './components/MatchSchedule';
import PositionTracker from './components/PositionTracker';
import TeamView from './components/TeamView';
import Admin from './components/Admin';
import Referee from './components/Referee';
import AIChat from './components/AIChat';
import TrainingPage from './pages/TrainingPage';
import LoginPage from './pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
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
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur', 'user']}>
            <TrainingPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'matches',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur', 'user']}>
            <MatchSchedule />
          </ProtectedRoute>
        )
      },
      {
        path: 'matches/:teamId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur', 'user']}>
            <MatchSchedule />
          </ProtectedRoute>
        )
      },
      {
        path: 'position',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <PositionTracker />
          </ProtectedRoute>
        )
      },
      {
        path: 'position/:teamId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <PositionTracker />
          </ProtectedRoute>
        )
      },
      {
        path: 'team',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur', 'user']}>
            <TeamView />
          </ProtectedRoute>
        )
      },
      {
        path: 'referee',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <Referee />
          </ProtectedRoute>
        )
      },
      {
        path: 'ai',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <AIChat />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <Admin />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/:section',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <Admin />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin/:section/:teamId',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'entraineur']}>
            <Admin />
          </ProtectedRoute>
        )
      },
      {
        path: '*',
        element: <Navigate to="/team" replace />
      }
    ]
  }
]);
