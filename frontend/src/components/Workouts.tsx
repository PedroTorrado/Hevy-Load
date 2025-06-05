import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  } from '@mui/material';
import { format, parse } from 'date-fns';
import axios from 'axios';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

interface WorkoutEntry {
  start_time: string;      // "5 Jun 2025, 11:35"
  title: string;           // workout title, e.g. "Chest and tricep"
  exercise_title: string;  // e.g. "Bench Press (Barbell)"
  description?: string;
  // plus other fields...
}

interface GroupedWorkout {
  date: string;            // yyyy-MM-dd string for grouping
  workout_title: string;   // workout title from the first entry of that day
  exercise_titles: string[]; // unique exercise titles for that date
  originalItems: WorkoutEntry[];
}

// Parse your custom date format "5 Jun 2025, 11:35"
const parseCustomDate = (dateStr: string) =>
  parse(dateStr, 'd MMM yyyy, HH:mm', new Date());

export default function Workouts() {
    const [groupedWorkouts, setGroupedWorkouts] = useState<GroupedWorkout[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
  
    useEffect(() => {
      fetchWorkouts();
    }, []);
  
    const fetchWorkouts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('http://localhost:5001/api/workouts');
        if (response.data.error) throw new Error(response.data.error);
        if (!Array.isArray(response.data)) throw new Error('Invalid data format');
  
        const sorted: WorkoutEntry[] = response.data.sort((a, b) => {
          return parseCustomDate(b.start_time).getTime() - parseCustomDate(a.start_time).getTime();
        });
  
        const groupsMap: Record<string, GroupedWorkout> = {};
  
        for (const workout of sorted) {
          const dateKey = format(parseCustomDate(workout.start_time), 'yyyy-MM-dd');
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
        }
  
        const groupedArray = Object.values(groupsMap)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 50);
  
        setGroupedWorkouts(groupedArray);
      } catch (err) {
        console.error('Error fetching workouts:', err);
        setError('Failed to fetch workouts. Please try again.');
        setGroupedWorkouts([]);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Workouts (Grouped by Date)
            </Typography>
  
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="primary" onClick={fetchWorkouts} disabled={loading}>
                Refresh Workouts
              </Button>
            </Box>
  
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : groupedWorkouts.length === 0 ? (
              <Typography color="text.secondary">No workouts found.</Typography>
            ) : (
              <Box>
                {groupedWorkouts.map(({ date, workout_title, exercise_titles = [], originalItems }) => {
                  const userWithAt = originalItems.find(item => item.description?.includes('@'))?.description || '';
                  const username = userWithAt.includes('@') ? userWithAt.match(/@(\S+)/)?.[1] : null;
  
                  // Optional: first start time formatted
                  const firstStartTime = originalItems
                    .map(w => parseCustomDate(w.start_time))
                    .sort((a, b) => a.getTime() - b.getTime())[0];
                  const formattedStartTime = firstStartTime ? format(firstStartTime, 'h:mm a') : '';
  
                  return (
                    <Paper
                      key={date}
                      sx={{
                        p: 2,
                        mb: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/workout/${date}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/workout/${date}`); }}
                    >
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {workout_title}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {format(parse(date, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}
                        </Typography>
                        {formattedStartTime && (
                          <Typography variant="body2" color="text.secondary">
                            Started at: {formattedStartTime}
                          </Typography>
                        )}
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          Exercises: {exercise_titles.join(', ')}
                        </Typography>
                      </Box>
  
                      {username && (
                        <Typography variant="body2" color="secondary" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                          with: {username}
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        </Container>
      </ThemeProvider>
    );
  }