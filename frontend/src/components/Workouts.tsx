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
import { format, parse, differenceInMinutes, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
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

// Parse your custom date format "5 Jun 2025, 11:35"
const parseCustomDate = (dateStr: string) =>
  parse(dateStr, 'd MMM yyyy, HH:mm', new Date());

// Add type definitions
type ExerciseCategory = {
  readonly keywords: readonly string[];
  readonly exclusions: readonly string[];
  readonly color: string;
};

type ExerciseCategories = {
  readonly [K in keyof typeof exerciseCategories]: ExerciseCategory;
};

export default function Workouts() {
    const [groupedWorkouts, setGroupedWorkouts] = useState<GroupedWorkout[]>([]);
    const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const navigate = useNavigate();
    const location = useLocation();
    const muiTheme = useMuiTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
    useEffect(() => {
      fetchWorkouts();
    }, []);
  
    useEffect(() => {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      const filteredWorkouts = allWorkouts.filter(workout => {
        const workoutDate = new Date(workout.start_time);
        return workoutDate >= monthStart && workoutDate <= monthEnd;
      });

      setWorkouts(filteredWorkouts);
  
        const groupsMap: Record<string, GroupedWorkout> = {};
      filteredWorkouts.forEach(workout => {
        const dateKey = format(new Date(workout.start_time), 'yyyy-MM-dd');
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
      });
  
        const groupedArray = Object.values(groupsMap)
        .sort((a, b) => b.date.localeCompare(a.date));
  
        setGroupedWorkouts(groupedArray);
    }, [currentDate, allWorkouts]);
  
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('http://localhost:5001/api/workouts');
        if (response.data.error) throw new Error(response.data.error);
        if (!Array.isArray(response.data)) throw new Error('Invalid data format');
  
        const sorted: Workout[] = response.data.sort((a, b) => {
          return parseCustomDate(b.start_time).getTime() - parseCustomDate(a.start_time).getTime();
        });
  
        setAllWorkouts(sorted);
        setWorkouts(sorted);
      } catch (err) {
        console.error('Error fetching workouts:', err);
        setError('Failed to fetch workouts. Please try again.');
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
      return differenceInMinutes(end, start);
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

          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" sx={{ 
              color: 'primary.main',
              textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
              mb: 4,
            }}>
              Workout History
            </Typography>
  
            {loading ? (
              <Box display="flex" justifyContent="center" my={8}>
                <CircularProgress sx={{ color: 'primary.main' }} />
              </Box>
            ) : error ? (
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center', 
                bgcolor: 'error.dark',
                border: '1px solid rgba(211, 47, 47, 0.2)',
              }}>
                <Typography color="error.light">{error}</Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {/* Calendar and Summary */}
                <Grid item xs={12} md={7}>
                  <Box sx={{ mb: 4 }}>
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
                      p: 2,
                      borderRadius: 2,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                      border: '1px solid rgba(144, 202, 249, 0.1)',
                      height: '100%',
                    }}
                  >
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: 'primary.main',
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <TrendingUpIcon />
                      Monthly Comparison
                    </Typography>

                    <Stack spacing={2}>
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
                        const currentMonthStats = {
                          totalWorkouts: new Set(workouts.map(w => format(new Date(w.start_time), 'yyyy-MM-dd'))).size,
                          totalSets: workouts.length,
                          estimatedMinutes: workouts.length * 2,
                          categoryCounts: {} as Record<string, number>,
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
                            {/* Workout Days Comparison */}
                            <Box sx={{ 
                              p: 1.5, 
                              borderRadius: 1,
                              bgcolor: 'rgba(144, 202, 249, 0.1)',
                              border: '1px solid rgba(144, 202, 249, 0.2)',
                            }}>
                              <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1 }}>
                                Workout Days
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="h6" color="primary.main">
                                    {currentMonthStats.totalWorkouts}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {format(currentDate, 'MMM yyyy')}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="h6" color={getChangeColor(currentMonthStats.totalWorkouts, prevMonthStats.totalWorkouts)}>
                                    {getChangeText(currentMonthStats.totalWorkouts, prevMonthStats.totalWorkouts)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    vs {format(prevMonth, 'MMM yyyy')}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            {/* Total Sets Comparison */}
                            <Box sx={{ 
                              p: 1.5, 
                              borderRadius: 1,
                              bgcolor: 'rgba(244, 143, 177, 0.1)',
                              border: '1px solid rgba(244, 143, 177, 0.2)',
                            }}>
                              <Typography variant="subtitle2" color="secondary.main" sx={{ mb: 1 }}>
                                Total Sets
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                                  <Typography variant="h6" color="secondary.main">
                                    {currentMonthStats.totalSets}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {format(currentDate, 'MMM yyyy')}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="h6" color={getChangeColor(currentMonthStats.totalSets, prevMonthStats.totalSets)}>
                                    {getChangeText(currentMonthStats.totalSets, prevMonthStats.totalSets)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    vs {format(prevMonth, 'MMM yyyy')}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            {/* Exercise Type Comparison */}
                            <Box sx={{ 
                              p: 1.5, 
                              borderRadius: 1,
                              bgcolor: 'rgba(102, 187, 106, 0.1)',
                              border: '1px solid rgba(102, 187, 106, 0.2)',
                            }}>
                              <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                                Exercise Types
                              </Typography>
                              <Stack spacing={1}>
                                {(Object.entries(exerciseCategories) as [keyof typeof exerciseCategories, ExerciseCategory][]).map(([category, { color }]) => {
                                  const current = currentMonthStats.categoryCounts[category] || 0;
                                  const previous = prevMonthStats.categoryCounts[category] || 0;
                                  return (
                                    <Box key={category} sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          backgroundColor: color,
                                          boxShadow: `0 0 4px ${color}`,
                                        }} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          {category}
                                        </Typography>
                                      </Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                          {current}
                                        </Typography>
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            color: getChangeColor(current, previous),
                                            display: 'flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {getChangeIcon(current, previous)}
                                          {getChangeText(current, previous)}
                                        </Typography>
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
                      p: 4, 
                      textAlign: 'center',
                      background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                    }}>
                      <Typography color="text.secondary" variant="h6" sx={{ mb: 1 }}>
                        No workouts found
                      </Typography>
                      <Typography color="text.secondary">
                        {isSameMonth(currentDate, new Date()) 
                          ? "Start tracking your workouts to see them here"
                          : `No workouts found for ${format(currentDate, 'MMMM yyyy')}`
                        }
                      </Typography>
                    </Paper>
                  ) : (
                    <Stack spacing={2}>
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
                              p: 3,
                        cursor: 'pointer',
                        display: 'flex',
                              flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                              alignItems: { xs: 'flex-start', sm: 'center' },
                              gap: 2,
                              background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
                      }}
                      onClick={() => navigate(`/workout/${date}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/workout/${date}`); }}
                    >
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" sx={{ 
                                mb: 1,
                                color: 'primary.main',
                                textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
                              }}>
                          {workout_title}
                        </Typography>
                              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                <Chip 
                                  icon={<AccessTimeIcon />}
                                  label={format(parse(date, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                                  size="small"
                                  variant="outlined"
                                />
                                {duration && (
                                  <Chip 
                                    icon={<AccessTimeIcon />}
                                    label={`${duration} min`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                <Chip 
                                  icon={<FitnessCenterIcon />}
                                  label={`${exercise_titles.length} exercises`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ 
                                mb: 1,
                                opacity: 0.8,
                              }}>
                                {exercise_titles.slice(0, 3).join(' • ')}
                                {exercise_titles.length > 3 && ` • +${exercise_titles.length - 3} more`}
                        </Typography>
                      </Box>
  
                      {username && (
                              <Chip
                                label={`with ${username}`}
                                color="secondary"
                                variant="filled"
                                sx={{ 
                                  alignSelf: { xs: 'flex-start', sm: 'center' },
                                  background: 'linear-gradient(45deg, #f48fb1 30%, #f06292 90%)',
                                  boxShadow: '0 3px 5px 2px rgba(244, 143, 177, .3)',
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