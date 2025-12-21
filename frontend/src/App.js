import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

// Pages
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import CreateTicketPage from './pages/CreateTicketPage';
import UsersPage from './pages/UsersPage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Components
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f',
    },
    secondary: {
      main: '#1976d2',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/chat" replace />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route
                    path="dashboard"
                    element={
                      <AdminRoute allowedRoles={['admin']}>
                        <DashboardPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="tickets"
                    element={
                      <PrivateRoute>
                        <TicketsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="tickets/create"
                    element={
                      <AdminRoute allowedRoles={['admin', 'staff']}>
                        <CreateTicketPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="tickets/:id"
                    element={
                      <PrivateRoute>
                        <TicketDetailPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="users"
                    element={
                      <AdminRoute allowedRoles={['admin']}>
                        <UsersPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="vehicles"
                    element={
                      <AdminRoute allowedRoles={['admin', 'staff']}>
                        <VehiclesPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="vehicles/:id"
                    element={
                      <AdminRoute allowedRoles={['admin', 'staff']}>
                        <VehicleDetailPage />
                      </AdminRoute>
                    }
                  />
                </Route>
              </Routes>
            </Router>
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;