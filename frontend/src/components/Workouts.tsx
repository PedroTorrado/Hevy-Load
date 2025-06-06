import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Container, 
    Box, 
    Typography, 
    Paper,
    CircularProgress,
    ThemeProvider,
    createTheme,
    CssBaseline,
    Button,
    Chip,
    Stack,
    IconButton,
    Tooltip,
    AppBar,
    Toolbar,
    useMediaQuery,
    useTheme as useMuiTheme,
    Grid,
  } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TimelineIcon from '@mui/icons-material/Timeline';
import MenuIcon from '@mui/icons-material/Menu';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { format, parse, differenceInMinutes, startOfMonth, endOfMonth, isSameMonth, isToday, isSameDay, eachDayOfInterval, isSameMonth as dateFnsIsSameMonth } from 'date-fns';
import axios from 'axios';
import Navigation from './Navigation';
import WorkoutCalendar, { exerciseCategories } from './WorkoutCalendar';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { 
      default: '#121212',
      paper: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { 
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: { 
      styleOverrides: { 
        root: { 
          backgroundImage: 'none',
          borderRadius: '12px',
          transition: 'all 0.3s ease-in-out',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(144, 202, 249, 0.1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(144, 202, 249, 0.2)',
          },
        } 
      } 
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          background: 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)',
          boxShadow: '0 3px 5px 2px rgba(144, 202, 249, .3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #64b5f6 30%, #42a5f5 90%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 5px 15px rgba(144, 202, 249, .4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          backgroundColor: 'rgba(144, 202, 249, 0.1)',
          border: '1px solid rgba(144, 202, 249, 0.2)',
          '&:hover': {
            backgroundColor: 'rgba(144, 202, 249, 0.15)',
          },
        },
      },
    },
  },
});

interface Workout {
  start_time: string;      // "5 Jun 2025, 11:35"
  title: string;           // workout title, e.g. "Chest and tricep"
  exercise_title: string;  // e.g. "Bench Press (Barbell)"
  description?: string;
  weight_kg?: number;
  reps?: number;
}

interface GroupedWorkout {
  date: string;            // yyyy-MM-dd string for grouping
  workout_title: string;   // workout title from the first entry of that day
  exercise_titles: string[]; // unique exercise titles for that date
  originalItems: Workout[];
}

interface ErrorDetails {
  message: string;
  technical: {
    errorType: string;
    details: string;
    browserInfo: {
      userAgent: string;
      platform: string;
      vendor: string;
    };
    timestamp: string;
    requestInfo?: {
      url: string;
      method: string;
      status?: number;
    };
    dataState?: {
      workoutsCount: number;
      filteredCount: number;
      currentMonth: string;
    };
  };
}

// Parse your custom date format "5 Jun 2025, 11:35" in a more browser-compatible way
const parseCustomDate = (dateStr: string) => {
  try {
    // First try the parse function
    const parsedDate = parse(dateStr, 'd MMM yyyy, HH:mm', new Date());
    if (isNaN(parsedDate.getTime())) throw new Error('Invalid date');
    return parsedDate;
  } catch (e) {
    // Fallback: manual parsing
    const [datePart, timePart] = dateStr.split(', ');
    const [day, month, year] = datePart.split(' ');
    const [hours, minutes] = timePart.split(':');
    
    const monthMap: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    return new Date(
      parseInt(year),
      monthMap[month],
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
  }
};

// Add type definitions
type ExerciseCategory = {
  readonly keywords: readonly string[];
  readonly exclusions: readonly string[];
  readonly color: string;
};

type ExerciseCategories = {
  readonly [K in keyof typeof exerciseCategories]: ExerciseCategory;
};

// API URL configuration - automatically detect server address
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = '5001';
  
  // Log connection details for debugging
  console.log('Current hostname:', hostname);
  console.log('Current protocol:', protocol);
  console.log('Current full URL:', window.location.href);
  
  // If running locally, use localhost, otherwise use the current hostname
  const apiUrl = `${protocol}//${hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname}:${port}`;
  console.log('API URL:', apiUrl);
  return apiUrl;
};

const API_URL = getApiUrl();

export default function Workouts() {
    const [groupedWorkouts, setGroupedWorkouts] = useState<GroupedWorkout[]>([]);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ErrorDetails | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const navigate = useNavigate();
    const location = useLocation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showTechnicalError, setShowTechnicalError] = useState(false);
  
    // Function to safely filter workouts by date range
    const filterWorkoutsByDateRange = (workouts: Workout[], start: Date, end: Date) => {
      return workouts.filter(workout => {
        try {
          const workoutDate = parseCustomDate(workout.start_time);
          return workoutDate >= start && workoutDate <= end;
        } catch (e) {
          console.error('Error parsing date:', workout.start_time, e);
          return false;
        }
      });
    };

    // Function to safely group workouts
    const groupWorkoutsByDate = (workouts: Workout[]) => {
      const groupsMap: Record<string, GroupedWorkout> = {};
      
      workouts.forEach(workout => {
        try {
          const workoutDate = parseCustomDate(workout.start_time);
          const dateKey = format(workoutDate, 'yyyy-MM-dd');
          
          if (!groupsMap[dateKey]) {
            groupsMap[dateKey] = {
              date: dateKey,
              workout_title: workout.title,
              exercise_titles: [],
              originalItems: [],
            };
          }
          
          groupsMap[dateKey].originalItems.push(workout);
          if (!groupsMap[dateKey].exercise_titles.includes(workout.exercise_title)) {
            groupsMap[dateKey].exercise_titles.push(workout.exercise_title);
          }
        } catch (e) {
          console.error('Error processing workout:', workout, e);
        }
      });
      
      return Object.values(groupsMap).sort((a, b) => b.date.localeCompare(a.date));
    };
  
    // Helper function to create error details
    const createError = (message: string, error: any, additionalInfo?: { [key: string]: any }) => {
      const getBrowserInfo = () => ({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
      });

      const getDataState = () => ({
        workoutsCount: allWorkouts.length,
        filteredCount: workouts.length,
        currentMonth: format(currentDate, 'MMMM yyyy')
      });

      let errorType = 'Unknown Error';
      let details = 'No additional details available';
      let requestInfo = undefined;

      if (error instanceof Error) {
        errorType = error.constructor.name;
        details = `${error.message}\n${error.stack || ''}`;
        
        // Check if it's an Axios error
        if ('isAxiosError' in error && error.isAxiosError) {
          const axiosError = error as any;
          requestInfo = {
            url: axiosError.config?.url || 'unknown',
            method: axiosError.config?.method?.toUpperCase() || 'unknown',
            status: axiosError.response?.status
          };
          details = `${details}\nResponse: ${JSON.stringify(axiosError.response?.data || {}, null, 2)}`;
        }
      } else if (typeof error === 'string') {
        errorType = 'String Error';
        details = error;
      } else {
        details = JSON.stringify(error, null, 2);
      }

      return {
        message,
        technical: {
          errorType,
          details,
          browserInfo: getBrowserInfo(),
          timestamp: new Date().toISOString(),
          requestInfo,
          dataState: getDataState(),
          ...additionalInfo
        }
      };
    };

    useEffect(() => {
      fetchWorkouts();
    }, []);
  
    useEffect(() => {
      if (allWorkouts.length > 0) {
        try {
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          
          const filteredWorkouts = filterWorkoutsByDateRange(allWorkouts, monthStart, monthEnd);
          const groupedArray = groupWorkoutsByDate(filteredWorkouts);
          
          setWorkouts(filteredWorkouts);
          setGroupedWorkouts(groupedArray);
        } catch (e) {
          console.error('Error in date filtering effect:', e);
          setError(createError(
            'Error processing workout dates',
            e,
            {
              failedWorkouts: [
                { workout: allWorkouts[0], parseError: null },
                { workout: allWorkouts[allWorkouts.length - 1], parseError: e }
              ]
            }
          ));
        }
      }
    }, [currentDate, allWorkouts]);
  
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/api/workouts`);
        if (response.data.error) throw new Error(response.data.error);
        if (!Array.isArray(response.data)) {
          throw new Error(`Invalid data format received. Expected array, got ${typeof response.data}. Data: ${JSON.stringify(response.data).slice(0, 100)}...`);
        }
        
        // Sort workouts with error handling
        const sorted = [...response.data].sort((a, b) => {
          try {
            return parseCustomDate(b.start_time).getTime() - parseCustomDate(a.start_time).getTime();
          } catch (e) {
            const sortError = new Error(`Failed to sort workouts: ${e instanceof Error ? e.message : 'Unknown error'}`);
            console.error('Error sorting workouts:', sortError);
            setError(createError(
              'Error sorting workouts',
              sortError,
              {
                failedWorkouts: [
                  { workout: a, parseError: null },
                  { workout: b, parseError: e }
                ]
              }
            ));
            return 0;
          }
        });
        
        setAllWorkouts(sorted);
        
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const filteredWorkouts = filterWorkoutsByDateRange(sorted, monthStart, monthEnd);
        const groupedArray = groupWorkoutsByDate(filteredWorkouts);
        
        setWorkouts(filteredWorkouts);
        setGroupedWorkouts(groupedArray);
      } catch (err) {
        console.error('Error fetching workouts:', err);
        setError(createError('Failed to fetch workouts', err));
        setAllWorkouts([]);
        setWorkouts([]);
        setGroupedWorkouts([]);
      } finally {
        setLoading(false);
      }
    };
  
    const calculateWorkoutDuration = (items: Workout[]) => {
      if (items.length < 2) return null;
      const times = items.map(w => parseCustomDate(w.start_time));
      const start = Math.min(...times.map(t => t.getTime()));
      const end = Math.max(...times.map(t => t.getTime()));
      const duration = differenceInMinutes(end, start);
      return duration > 0 ? duration : null;
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #121212 0%, #1a2027 100%)',
          pb: 4,
        }}>
          <Navigation onRefresh={fetchWorkouts} loading={loading} />

          <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" component="h1" sx={{ 
              color: 'primary.main',
              textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
              mb: { xs: 2, sm: 4 },
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}>
              Workout History
            </Typography>
  
            {loading ? (
              <Box display="flex" justifyContent="center" my={8}>
                <CircularProgress sx={{ color: 'primary.main' }} />
              </Box>
            ) : error ? (
              <Paper sx={{ 
                p: { xs: 2, sm: 3 }, 
                mb: 3,
                bgcolor: 'error.dark',
                border: '1px solid rgba(211, 47, 47, 0.2)',
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography color="error.light" variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    {error.message}
                  </Typography>
                  
                  {error.technical && (
                    <>
                      <Button
                        size="small"
                        sx={{ alignSelf: 'flex-start', mt: 1 }}
                        onClick={() => setShowTechnicalError(!showTechnicalError)}
                      >
                        {showTechnicalError ? 'Hide' : 'Show'} Technical Details
                      </Button>
                      
                      {showTechnicalError && (
                        <Box sx={{ 
                          mt: 1,
                          p: 2,
                          bgcolor: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: 'error.light',
                          opacity: 0.8
                        }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Error Type: {error.technical.errorType}</Typography>
                          
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Details:</Typography>
                          <Box sx={{ ml: 2, mb: 2 }}>{error.technical.details}</Box>

                          {error.technical.requestInfo && (
                            <>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>Request Information:</Typography>
                              <Box sx={{ ml: 2, mb: 2 }}>
                                URL: {error.technical.requestInfo.url}<br />
                                Method: {error.technical.requestInfo.method}<br />
                                Status: {error.technical.requestInfo.status || 'N/A'}
                              </Box>
                            </>
                          )}

                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Data State:</Typography>
                          <Box sx={{ ml: 2, mb: 2 }}>
                            Total Workouts: {error.technical.dataState?.workoutsCount}<br />
                            Filtered Workouts: {error.technical.dataState?.filteredCount}<br />
                            Current Month: {error.technical.dataState?.currentMonth}
                          </Box>

                          <Typography variant="subtitle2" sx={{ mb: 1 }}>Browser Information:</Typography>
                          <Box sx={{ ml: 2, mb: 2 }}>
                            User Agent: {error.technical.browserInfo.userAgent}<br />
                            Platform: {error.technical.browserInfo.platform}<br />
                            Vendor: {error.technical.browserInfo.vendor}
                          </Box>

                          <Typography variant="caption" display="block" sx={{ mt: 2, opacity: 0.7 }}>
                            Error occurred at: {new Date(error.technical.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={fetchWorkouts}
                      sx={{ 
                        bgcolor: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        }
                      }}
                    >
                      Try Again
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const errorText = `
Error Report:
-------------
Type: ${error.technical.errorType}
Time: ${error.technical.timestamp}
Message: ${error.message}
Details: ${error.technical.details}
Browser: ${error.technical.browserInfo.userAgent}
Platform: ${error.technical.browserInfo.platform}
Data State:
- Total Workouts: ${error.technical.dataState?.workoutsCount}
- Filtered: ${error.technical.dataState?.filteredCount}
- Month: ${error.technical.dataState?.currentMonth}
${error.technical.requestInfo ? `
Request Info:
- URL: ${error.technical.requestInfo.url}
- Method: ${error.technical.requestInfo.method}
- Status: ${error.technical.requestInfo.status}` : ''}
`;
                        navigator.clipboard.writeText(errorText);
                      }}
                      sx={{ 
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          borderColor: 'primary.light',
                          color: 'primary.light',
                        }
                      }}
                    >
                      Copy Error Report
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ) : (
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Calendar and Summary */}
                <Grid item xs={12} md={7}>
                  <Box sx={{ mb: { xs: 2, sm: 4 } }}>
                    <WorkoutCalendar 
                      workouts={allWorkouts}
                      currentDate={currentDate}
                      onMonthChange={setCurrentDate}
                    />
                  </Box>
                </Grid>

                {/* Monthly Comparison */}
                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                      border: '1px solid rgba(144, 202, 249, 0.1)',
                      height: '100%',
                      minHeight: { xs: 'auto', sm: '300px' },
                      maxWidth: '600px',
                      mx: 'auto',
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'primary.main',
                        mb: { xs: 1.5, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'center',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                      Monthly Comparison
                    </Typography>

                    <Stack 
                      spacing={{ xs: 1.5, sm: 2 }}
                      sx={{ maxWidth: '500px', mx: 'auto' }}
                    >
                      {/* Get previous month's data */}
                      {(() => {
                        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
                        const prevMonthStart = startOfMonth(prevMonth);
                        const prevMonthEnd = endOfMonth(prevMonth);
                        
                        const prevMonthWorkouts = allWorkouts.filter(workout => {
                          const workoutDate = new Date(workout.start_time);
                          return workoutDate >= prevMonthStart && workoutDate <= prevMonthEnd;
                        });

                        const prevMonthStats = {
                          totalWorkouts: new Set(prevMonthWorkouts.map(w => format(new Date(w.start_time), 'yyyy-MM-dd'))).size,
                          totalSets: prevMonthWorkouts.length,
                          estimatedMinutes: prevMonthWorkouts.length * 2,
                          categoryCounts: {} as Record<string, number>,
                        };

                        // Calculate category counts for previous month
                        prevMonthWorkouts.forEach(workout => {
                          const exerciseTitle = workout.exercise_title.toLowerCase();
                          (Object.entries(exerciseCategories) as [keyof typeof exerciseCategories, ExerciseCategory][]).forEach(([category, { keywords, exclusions }]) => {
                            const hasExclusion = exclusions.some(exclusion => exerciseTitle.includes(exclusion));
                            if (!hasExclusion && keywords.some(keyword => exerciseTitle.includes(keyword))) {
                              prevMonthStats.categoryCounts[category] = (prevMonthStats.categoryCounts[category] || 0) + 1;
                            }
                          });
                        });

                        // Calculate current month's stats
                        const isCurrentMonth = dateFnsIsSameMonth(currentDate, new Date());
                        const today = new Date();
                        const daysElapsed = isCurrentMonth ? today.getDate() : 30;
                        const daysRemaining = isCurrentMonth ? 30 - daysElapsed : 0;

                        // Calculate projected stats for current month
                        const calculateProjectedStats = (current: number) => {
                          if (!isCurrentMonth) return null;
                          const dailyAverage = current / daysElapsed;
                          return Math.round(dailyAverage * 30);
                        };

                        const currentMonthStats = {
                          totalWorkouts: new Set(workouts.map(w => format(new Date(w.start_time), 'yyyy-MM-dd'))).size,
                          totalSets: workouts.length,
                          estimatedMinutes: workouts.length * 2,
                          categoryCounts: {} as Record<string, number>,
                          daysElapsed,
                          isCurrentMonth,
                        };

                        // Calculate category counts for current month
                        workouts.forEach(workout => {
                          const exerciseTitle = workout.exercise_title.toLowerCase();
                          (Object.entries(exerciseCategories) as [keyof typeof exerciseCategories, ExerciseCategory][]).forEach(([category, { keywords, exclusions }]) => {
                            const hasExclusion = exclusions.some(exclusion => exerciseTitle.includes(exclusion));
                            if (!hasExclusion && keywords.some(keyword => exerciseTitle.includes(keyword))) {
                              currentMonthStats.categoryCounts[category] = (currentMonthStats.categoryCounts[category] || 0) + 1;
                            }
                          });
                        });

                        const getChangeIcon = (current: number, previous: number) => {
                          if (current > previous) return <TrendingUpIcon color="success" />;
                          if (current < previous) return <TrendingDownIcon color="error" />;
                          return <RemoveIcon color="disabled" />;
                        };

                        const getChangeColor = (current: number, previous: number) => {
                          if (current > previous) return 'success.main';
                          if (current < previous) return 'error.main';
                          return 'text.secondary';
                        };

                        const getChangeText = (current: number, previous: number) => {
                          if (previous === 0) return 'New';
                          const change = ((current - previous) / previous) * 100;
                          return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
                        };

                        return (
                          <>
                            {/* Workout Consistency Comparison */}
                            <Box sx={{ 
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 1,
                              bgcolor: 'rgba(144, 202, 249, 0.1)',
                              border: '1px solid rgba(144, 202, 249, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                            }}>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5, 
                                mb: 0.5,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                <CalendarMonthIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
                                Workout Consistency
                                {isCurrentMonth && (
                                  <Typography 
                                    component="span" 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'primary.light',
                                      ml: 0.5,
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                    }}
                                  >
                                    ({daysElapsed}/30 days)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="h6" color="primary.main" sx={{ 
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}>
                                {Math.round((currentMonthStats.totalWorkouts / daysElapsed) * 100)}% of days
                              </Typography>
                              {isCurrentMonth && (
                                <Typography variant="caption" color="primary.light" sx={{ 
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  mt: 0.5
                                }}>
                                  Projected: {calculateProjectedStats(currentMonthStats.totalWorkouts)} days
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getChangeIcon(
                                  Math.round((currentMonthStats.totalWorkouts / daysElapsed) * 100),
                                  Math.round((prevMonthStats.totalWorkouts / 30) * 100)
                                )}
                                <Typography 
                                  variant="caption" 
                                  color={getChangeColor(
                                    Math.round((currentMonthStats.totalWorkouts / daysElapsed) * 100),
                                    Math.round((prevMonthStats.totalWorkouts / 30) * 100)
                                  )}
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  {getChangeText(
                                    Math.round((currentMonthStats.totalWorkouts / daysElapsed) * 100),
                                    Math.round((prevMonthStats.totalWorkouts / 30) * 100)
                                  )}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                mt: 0.5
                              }}>
                                {currentMonthStats.totalWorkouts} vs {prevMonthStats.totalWorkouts} days
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                {Math.round((currentMonthStats.totalWorkouts / daysElapsed) * 7)} vs {Math.round(prevMonthStats.totalWorkouts / 4)} per week
                              </Typography>
                            </Box>

                            {/* Training Volume Comparison */}
                            <Box sx={{ 
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 1,
                              bgcolor: 'rgba(244, 143, 177, 0.1)',
                              border: '1px solid rgba(244, 143, 177, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                            }}>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5, 
                                mb: 0.5,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                <FitnessCenterIcon sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }} />
                                Training Volume
                                {isCurrentMonth && (
                                  <Typography 
                                    component="span" 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'secondary.light',
                                      ml: 0.5,
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                    }}
                                  >
                                    (Current Pace)
                                  </Typography>
                                )}
                              </Typography>
                              <Typography variant="h6" color="secondary.main" sx={{ 
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}>
                                {Math.round((currentMonthStats.totalSets / daysElapsed) * 7)} sets/week
                              </Typography>
                              {isCurrentMonth && (
                                <Typography variant="caption" color="secondary.light" sx={{ 
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                  mt: 0.5
                                }}>
                                  Projected: {calculateProjectedStats(currentMonthStats.totalSets)} total sets
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getChangeIcon(
                                  Math.round((currentMonthStats.totalSets / daysElapsed) * 7),
                                  Math.round(prevMonthStats.totalSets / 4)
                                )}
                                <Typography 
                                  variant="caption" 
                                  color={getChangeColor(
                                    Math.round((currentMonthStats.totalSets / daysElapsed) * 7),
                                    Math.round(prevMonthStats.totalSets / 4)
                                  )}
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  {getChangeText(
                                    Math.round((currentMonthStats.totalSets / daysElapsed) * 7),
                                    Math.round(prevMonthStats.totalSets / 4)
                                  )}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                mt: 0.5
                              }}>
                                {Math.round(currentMonthStats.totalSets / currentMonthStats.totalWorkouts)} vs {Math.round(prevMonthStats.totalSets / prevMonthStats.totalWorkouts)} sets/workout
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                {Math.round(currentMonthStats.estimatedMinutes / 60)} vs {Math.round(prevMonthStats.estimatedMinutes / 60)} total hours
                                {isCurrentMonth && ` (${Math.round((currentMonthStats.estimatedMinutes / daysElapsed) * 30 / 60)} projected)`}
                              </Typography>
                            </Box>

                            {/* Training Split Comparison */}
                            <Box sx={{ 
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 1,
                              bgcolor: 'rgba(102, 187, 106, 0.1)',
                              border: '1px solid rgba(102, 187, 106, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                            }}>
                              <Typography variant="caption" color="text.secondary" sx={{ 
                                mb: 0.5,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                Training Split Changes {isCurrentMonth && '(Current Pace)'}
                              </Typography>
                              <Stack spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
                                {(Object.entries(exerciseCategories) as [keyof typeof exerciseCategories, ExerciseCategory][]).map(([category, { color }]) => {
                                  const current = currentMonthStats.categoryCounts[category] || 0;
                                  const previous = prevMonthStats.categoryCounts[category] || 0;
                                  const currentWeekly = Math.round((current / daysElapsed) * 7 * 10) / 10;
                                  const previousWeekly = Math.round((previous / 30) * 7 * 10) / 10;
                                  const weeklyChange = Math.round((currentWeekly - previousWeekly) * 10) / 10;
                                  const projectedSets = isCurrentMonth ? Math.round((current / daysElapsed) * 30) : null;
                                  
                                  return (
                                    <Box key={category} sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1,
                                      width: '100%',
                                      justifyContent: 'space-between',
                                      px: { xs: 1, sm: 2 }
                                    }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{
                                          width: { xs: 6, sm: 8 },
                                          height: { xs: 6, sm: 8 },
                                          borderRadius: '50%',
                                          backgroundColor: color,
                                          boxShadow: `0 0 4px ${color}`,
                                        }} />
                                        <Typography variant="caption" sx={{ 
                                          color: 'text.secondary',
                                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                        }}>
                                          {category}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" sx={{ 
                                          color: 'text.secondary',
                                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                        }}>
                                          {currentWeekly.toFixed(1)}/week
                                          {isCurrentMonth && projectedSets && (
                                            <Typography 
                                              component="span" 
                                              variant="caption" 
                                              sx={{ 
                                                color: 'primary.light',
                                                ml: 0.5,
                                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                              }}
                                            >
                                              ({projectedSets} projected)
                                            </Typography>
                                          )}
                                        </Typography>
                                        {weeklyChange !== 0 && (
                                          <Typography 
                                            variant="caption" 
                                            color={weeklyChange > 0 ? 'success.main' : 'error.main'}
                                            sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                          >
                                            ({weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)})
                                          </Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            </Box>
                          </>
                        );
                      })()}
                    </Stack>
                  </Paper>
                </Grid>

                {/* Workout List */}
                <Grid item xs={12}>
                  {workouts.length === 0 ? (
                    <Paper sx={{ 
                      p: { xs: 2, sm: 4 }, 
                      textAlign: 'center',
                      background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                    }}>
                      <Typography color="text.secondary" variant="h6" sx={{ 
                        mb: 1,
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}>
                        No workouts found
                      </Typography>
                      <Typography color="text.secondary" sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}>
                        {isSameMonth(currentDate, new Date()) 
                          ? "Start tracking your workouts to see them here"
                          : `No workouts found for ${format(currentDate, 'MMMM yyyy')}`
                        }
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack spacing={{ xs: 1.5, sm: 2 }}>
                      {groupedWorkouts.map(({ date, workout_title, exercise_titles = [], originalItems }) => {
                        const userWithAt = originalItems.find(item => item.description?.includes('@'))?.description || '';
                        const username = userWithAt.includes('@') ? userWithAt.match(/@(\S+)/)?.[1] : null;
                        const duration = calculateWorkoutDuration(originalItems);
                        const firstStartTime = originalItems
                          .map(w => parseCustomDate(w.start_time))
                          .sort((a, b) => a.getTime() - b.getTime())[0];
                        const formattedStartTime = firstStartTime ? format(firstStartTime, 'h:mm a') : '';
        
                        return (
                          <Paper
                            key={date}
                            sx={{
                              p: { xs: 2, sm: 3 },
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                              justifyContent: 'space-between',
                              alignItems: { xs: 'flex-start', sm: 'center' },
                              gap: { xs: 1, sm: 2 },
                              background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
                              },
                              '& .MuiChip-root': {
                                m: { xs: '4px 0', sm: '0 4px' }
                              }
                            }}
                            onClick={() => navigate(`/workout/${date}`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/workout/${date}`); }}
                          >
                            <Box sx={{ flex: 1, width: '100%' }}>
                              <Typography variant="h6" sx={{ 
                                mb: { xs: 0.5, sm: 1 },
                                color: 'primary.main',
                                textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                                fontSize: { xs: '1.1rem', sm: '1.25rem' }
                              }}>
                                {workout_title}
                              </Typography>
                              <Stack 
                                direction={{ xs: 'column', sm: 'row' }} 
                                spacing={{ xs: 0.5, sm: 1 }} 
                                sx={{ 
                                  mb: { xs: 1, sm: 2 },
                                  flexWrap: 'wrap',
                                  gap: { xs: 0.5, sm: 1 }
                                }}
                              >
                                <Chip 
                                  icon={<AccessTimeIcon />}
                                  label={format(parse(date, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                                  size={isMobile ? "small" : "medium"}
                                  variant="outlined"
                                  sx={{ maxWidth: { xs: '100%', sm: 'auto' } }}
                                />
                                <Chip 
                                  icon={<FitnessCenterIcon />}
                                  label={exercise_titles.length > 0 ? `${exercise_titles.length} exercises` : 'No exercises'}
                                  size={isMobile ? "small" : "medium"}
                                  variant="outlined"
                                />
                                {duration && (
                                  <Chip 
                                    icon={<AccessTimeIcon />}
                                    label={`${duration} min`}
                                    size={isMobile ? "small" : "medium"}
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  mb: { xs: 0.5, sm: 1 },
                                  opacity: 0.8,
                                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                  lineHeight: 1.4,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {exercise_titles.slice(0, 3).join(' • ')}
                                {exercise_titles.length > 3 && ` • +${exercise_titles.length - 3} more`}
                              </Typography>
                            </Box>
        
                            {username && (
                              <Chip
                                label={`with ${username}`}
                                color="secondary"
                                variant="filled"
                                size={isMobile ? "small" : "medium"}
                                sx={{ 
                                  alignSelf: { xs: 'flex-start', sm: 'center' },
                                  background: 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)',
                                  boxShadow: '0 3px 5px 2px rgba(244, 143, 177, .3)',
                                  mt: { xs: 1, sm: 0 }
                                }}
                              />
                            )}
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Grid>
              </Grid>
            )}
          </Container>
          </Box>
      </ThemeProvider>
    );
  }