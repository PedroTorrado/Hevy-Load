import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  TextField
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import axios from 'axios';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface NavigationProps {
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Navigation({ onRefresh, loading }: NavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { isAuthenticated, refreshAuth } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Add getApiUrl and API_URL logic
  const getApiUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = '5001';
    
    // If running in Docker (nginx proxy), use relative URLs
    if (hostname === 'localhost' && window.location.port === '1234') {
      return ''; // Use relative URLs for Docker deployment
    }
    
    // Otherwise use the dynamic URL construction
    return `${protocol}//${hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname}:${port}`;
  };
  const API_URL = getApiUrl();

  const handleLogout = async () => {
    await axios.post(`${API_URL}/api/logout`, {}, { withCredentials: true });
    await refreshAuth();
    handleClose();
    navigate('/');
  };

  const NavButton = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <Button
      variant={location.pathname === to ? "contained" : "outlined"}
      onClick={() => {
        navigate(to);
        setMobileMenuOpen(false);
      }}
      startIcon={<Icon />}
      sx={{
        minWidth: isMobile ? 'auto' : 160,
        px: isMobile ? 1 : 2,
        py: 1,
        borderRadius: 2,
        borderColor: location.pathname === to ? 'transparent' : 'primary.main',
        background: location.pathname === to 
          ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
          : 'transparent',
        boxShadow: location.pathname === to 
          ? '0 3px 5px 2px rgba(144, 202, 249, .3)'
          : 'none',
        '&:hover': {
          background: location.pathname === to
            ? 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)'
            : 'rgba(144, 202, 249, 0.1)',
          transform: 'translateY(-2px)',
          boxShadow: location.pathname === to
            ? '0 5px 15px rgba(144, 202, 249, .4)'
            : '0 2px 8px rgba(144, 202, 249, .2)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {!isMobile && label}
    </Button>
  );

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
        borderBottom: '1px solid rgba(144, 202, 249, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isMobile ? (
            <IconButton
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              sx={{
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(144, 202, 249, 0.1)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                flexGrow: { xs: 1, sm: 0 },
              }}
            >
              <img src="/512x512.svg" alt="Hevy Load Logo" style={{ height: '48px', marginRight: '8px' }} />
            </Box>
          )}
          {!isMobile && (
            <Stack direction="row" spacing={2}>
              <NavButton to="/" icon={HomeIcon} label="Home" />
              <NavButton to="/dashboard" icon={DashboardIcon} label="Dashboard" />
              <NavButton to="/workouts" icon={TimelineIcon} label="Workouts" />
            </Stack>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        {/* User button on the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={handleUserMenu}
            sx={{ color: 'primary.main', ml: 1 }}
            aria-label="user menu"
          >
            <AccountCircleIcon fontSize="large" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {isAuthenticated ? (
              <>
                <MenuItem onClick={() => { handleClose(); navigate('/user'); }}>User Info</MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </>
            ) : (
              <>
                <MenuItem onClick={() => { handleClose(); navigate('/login'); }}>Login</MenuItem>
                <MenuItem onClick={() => { handleClose(); navigate('/register'); }}>Register</MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </Toolbar>
      {isMobile && mobileMenuOpen && (
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            borderTop: '1px solid rgba(144, 202, 249, 0.1)',
          }}
        >
          <NavButton to="/" icon={HomeIcon} label="Home" />
          <NavButton to="/dashboard" icon={DashboardIcon} label="Dashboard" />
          <NavButton to="/workouts" icon={TimelineIcon} label="Workouts" />
        </Box>
      )}
    </AppBar>
  );
} 