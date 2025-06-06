import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Box,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInMinutes } from 'date-fns';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface Workout {
  start_time: string;
  title: string;
  exercise_title: string;
  description?: string;
  weight_kg?: number;
  reps?: number;
}

interface WorkoutCalendarProps {
  workouts: Workout[];
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

// Exercise type categories and their colors
export const exerciseCategories = {
  chest: {
    keywords: [
      'bench press',
      'incline bench',
      'decline bench',
      'chest press',
      'chest fly',
      'pec deck',
      'butterfly',
      'push up',
      'dip',
    ],
    exclusions: ['wrist', 'behind the back', 'lateral', 'delt', 'shoulder', 'tricep'],
    color: '#90caf9', // Blue
  },
  legs: {
    keywords: [
      'squat',
      'leg press',
      'leg extension',
      'leg curl',
      'calf raise',
      'lunge',
      'bulgarian',
      'step up',
      'hip thrust',
      'glute',
      'romanian deadlift',
      'rdl',
    ],
    exclusions: ['wrist', 'tricep'],
    color: '#f48fb1', // Pink
  },
  back: {
    keywords: [
      'conventional deadlift',
      'sumo deadlift',
      'deadlift (barbell)',
      'pull up',
      'chin up',
      'lat pulldown',
      'barbell row',
      'dumbbell row',
      'cable row',
      'iso-lateral',
      'seated row',
      'face pull',
      'bicep curl',
      'hammer curl',
      'preacher curl',
      'shrug',
      'upright row',
      'rear delt',
      'reverse fly',
    ],
    exclusions: ['wrist', 'tricep', 'chest', 'romanian', 'rdl', 'lateral raise', 'front raise'],
    color: '#66bb6a', // Green
  },
} as const;

function WorkoutCalendar({ workouts, currentDate, onMonthChange }: WorkoutCalendarProps) {
  const navigate = useNavigate();

  // Get all days in the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group workouts by date and calculate statistics
  const { workoutsByDate, monthlyStats } = workouts.reduce((acc, workout) => {
    const date = format(new Date(workout.start_time), 'yyyy-MM-dd');
    const workoutDate = new Date(workout.start_time);
    
    // Only count workouts in the current month
    if (isSameMonth(workoutDate, currentDate)) {
      // Update monthly stats
      if (!acc.monthlyStats.workoutDays.has(date)) {
        acc.monthlyStats.workoutDays.add(date);
        acc.monthlyStats.totalWorkouts++;
      }
      
      // Calculate workout duration (assuming 2 minutes per set)
      acc.monthlyStats.totalSets++;
      acc.monthlyStats.estimatedMinutes += 2; // 2 minutes per set
    }

    // Group workouts by date for calendar display
    if (!acc.workoutsByDate[date]) {
      acc.workoutsByDate[date] = {
        exercises: new Set<string>(),
        categories: new Set<string>(),
      };
    }
    acc.workoutsByDate[date].exercises.add(workout.exercise_title);
    
    // Categorize the exercise
    const exerciseTitle = workout.exercise_title.toLowerCase();
    Object.entries(exerciseCategories).forEach(([category, { keywords, exclusions }]) => {
      const hasExclusion = exclusions.some(exclusion => exerciseTitle.includes(exclusion));
      if (!hasExclusion && keywords.some(keyword => exerciseTitle.includes(keyword))) {
        acc.workoutsByDate[date].categories.add(category);
        if (isSameMonth(workoutDate, currentDate)) {
          acc.monthlyStats.categoryCounts[category] = (acc.monthlyStats.categoryCounts[category] || 0) + 1;
        }
      }
    });
    
    return acc;
  }, {
    workoutsByDate: {} as Record<string, { exercises: Set<string>; categories: Set<string> }>,
    monthlyStats: {
      totalWorkouts: 0,
      totalSets: 0,
      estimatedMinutes: 0,
      workoutDays: new Set<string>(),
      categoryCounts: {} as Record<string, number>,
    }
  });

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (workoutsByDate[dateStr]) {
      navigate(`/workout/${dateStr}`);
    }
  };

  const handlePrevMonth = () => {
    onMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <Stack spacing={2}>
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
          border: '1px solid rgba(144, 202, 249, 0.1)',
          maxWidth: '600px',
          mx: 'auto',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <IconButton 
            onClick={handlePrevMonth}
            sx={{ color: 'primary.main', p: 0.5 }}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography 
            variant="subtitle1"
            sx={{ 
              color: 'primary.main',
              fontWeight: 600,
              textShadow: '0 0 10px rgba(144, 202, 249, 0.3)',
            }}
          >
            {format(currentDate, 'MMMM yyyy')}
          </Typography>
          <IconButton 
            onClick={handleNextMonth}
            sx={{ color: 'primary.main', p: 0.5 }}
            size="small"
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Grid container spacing={0.5}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Grid item xs={12/7} key={day}>
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block',
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontWeight: 600,
                  mb: 0.5,
                  fontSize: '0.7rem',
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}

          {/* Calendar days */}
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayWorkouts = workoutsByDate[dateStr];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <Grid item xs={12/7} key={dateStr}>
                <Tooltip 
                  title={dayWorkouts ? 
                    `${dayWorkouts.exercises.size} exercises on ${format(day, 'MMM d, yyyy')}` : 
                    format(day, 'MMM d, yyyy')
                  }
                >
                  <Box
                    onClick={() => handleDayClick(day)}
                    sx={{
                      aspectRatio: '1',
                      p: 0.25,
                      borderRadius: 1,
                      cursor: dayWorkouts ? 'pointer' : 'default',
                      position: 'relative',
                      backgroundColor: isCurrentDay ? 'rgba(144, 202, 249, 0.1)' : 'transparent',
                      border: isCurrentDay ? '1px solid rgba(144, 202, 249, 0.3)' : '1px solid transparent',
                      opacity: isCurrentMonth ? 1 : 0.5,
                      '&:hover': dayWorkouts ? {
                        backgroundColor: 'rgba(144, 202, 249, 0.1)',
                        transform: 'translateY(-1px)',
                      } : {},
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'center',
                        color: isCurrentMonth ? 'text.primary' : 'text.secondary',
                        fontWeight: isCurrentDay ? 600 : 400,
                        fontSize: '0.75rem',
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>

                    {/* Exercise category indicators */}
                    {dayWorkouts && (
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        gap: 1,
                        mt: 1,
                      }}>
                        {Array.from(dayWorkouts.categories).map((category) => (
                          <Box
                            key={category}
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: exerciseCategories[category as keyof typeof exerciseCategories].color,
                              boxShadow: `0 0 6px ${exerciseCategories[category as keyof typeof exerciseCategories].color}`,
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>

        {/* Legend */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 3,
          mt: 2,
          pt: 1,
          borderTop: '1px solid rgba(144, 202, 249, 0.1)',
        }}>
          {Object.entries(exerciseCategories).map(([category, { color }]) => (
            <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }} />
              <Typography variant="caption" sx={{ 
                color: 'text.secondary', 
                textTransform: 'capitalize',
                fontSize: '0.8rem',
              }}>
                {category}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Monthly Summary */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)',
          border: '1px solid rgba(144, 202, 249, 0.1)',
          maxWidth: '600px',
          mx: 'auto',
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
            justifyContent: 'center',
          }}
        >
          <CalendarMonthIcon />
          {format(currentDate, 'MMMM yyyy')} Summary
        </Typography>

        <Grid 
          container 
          spacing={2} 
          justifyContent="center"
          sx={{ maxWidth: '500px', mx: 'auto' }}
        >
          <Grid item xs={12} sm={4} sx={{ minWidth: '140px' }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1,
              bgcolor: 'rgba(144, 202, 249, 0.1)',
              border: '1px solid rgba(144, 202, 249, 0.2)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <AccessTimeIcon fontSize="small" />
                Total Workout Time
              </Typography>
              <Typography variant="h6" color="primary.main">
                {Math.round(monthlyStats.estimatedMinutes / 60)} hours
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {monthlyStats.estimatedMinutes} minutes
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4} sx={{ minWidth: '140px' }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1,
              bgcolor: 'rgba(244, 143, 177, 0.1)',
              border: '1px solid rgba(244, 143, 177, 0.2)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <FitnessCenterIcon fontSize="small" />
                Workouts
              </Typography>
              <Typography variant="h6" color="secondary.main">
                {monthlyStats.totalWorkouts} days
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {monthlyStats.totalSets} total sets
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={4} sx={{ minWidth: '140px' }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 1,
              bgcolor: 'rgba(102, 187, 106, 0.1)',
              border: '1px solid rgba(102, 187, 106, 0.2)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                Exercise Types
              </Typography>
              <Stack spacing={0.5} alignItems="center">
                {Object.entries(exerciseCategories).map(([category, { color }]) => (
                  <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: color,
                      boxShadow: `0 0 4px ${color}`,
                    }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {category}: {monthlyStats.categoryCounts[category] || 0}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}

export default WorkoutCalendar; 