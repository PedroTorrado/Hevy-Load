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
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuIcon from '@mui/icons-material/Menu';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link } from 'react-router-dom';

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
        {onRefresh && (
          <Tooltip title="Refresh data">
            <IconButton 
              onClick={onRefresh} 
              disabled={loading}
              sx={{ 
                bgcolor: 'rgba(144, 202, 249, 0.1)',
                border: '1px solid rgba(144, 202, 249, 0.2)',
                '&:hover': { 
                  bgcolor: 'rgba(144, 202, 249, 0.15)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
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