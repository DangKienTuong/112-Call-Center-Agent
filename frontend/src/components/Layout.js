import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Phone,
  Dashboard,
  Assignment,
  Settings,
  Person,
  Logout,
  Language,
  LocalHospital,
  People,
  AdminPanelSettings,
  DirectionsCar
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

function Layout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  const menuItems = [
    { text: t('navigation.chat'), icon: <Phone />, path: '/chat', public: true },
    { text: t('navigation.dashboard'), icon: <Dashboard />, path: '/dashboard', roles: ['admin'] },
    { text: t('navigation.tickets'), icon: <Assignment />, path: '/tickets' },
    { text: 'Quản lý Xe', icon: <DirectionsCar />, path: '/vehicles', roles: ['admin', 'staff'] },
    { text: t('navigation.users'), icon: <People />, path: '/users', roles: ['admin'] }
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <LocalHospital sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
          112
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => {
          // Skip if not public and user not logged in
          if (!item.public && !user) return null;
          // Skip if role-restricted and user doesn't have the role
          if (item.roles && (!user || !item.roles.includes(user.role))) return null;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) handleDrawerToggle();
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(45deg, #d32f2f 30%, #ff5722 90%)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>

          <IconButton color="inherit" onClick={changeLanguage}>
            <Language />
          </IconButton>

          {user ? (
            <>
              <Button
                color="inherit"
                onClick={handleProfileMenuOpen}
                startIcon={<Person />}
              >
                {user.username}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
              >
                <MenuItem onClick={() => navigate('/profile')}>
                  <Person sx={{ mr: 1 }} /> {t('navigation.profile')}
                </MenuItem>
                <MenuItem onClick={() => navigate('/settings')}>
                  <Settings sx={{ mr: 1 }} /> {t('navigation.settings')}
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 1 }} /> {t('auth.logout')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              {t('auth.login')}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default Layout;