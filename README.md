# Workout Data Visualization

A web application for visualizing workout data from CSV files.

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install flask flask-cors pymongo pandas python-dotenv numpy
   ```

3. Start the backend server:
   ```bash
   python app.py
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

## Usage

- Upload a CSV file with workout data.
- Select exercises, chart types, and axes.
- Toggle options like "Show only top sets" and "Show even date spacing."

## Technologies Used

- **Backend**: Flask, MongoDB, Pandas
- **Frontend**: React, Material-UI, Chart.js

## Features

- Modern React frontend with Material-UI components
- Interactive data visualization using Chart.js
- MongoDB database for persistent storage
- CSV file upload and processing
- Multiple chart types (Line, Bar, Scatter)
- Exercise-specific filtering
- Top set analysis
- Date-based visualization with configurable spacing

## Development

The application is structured as follows:
- `/frontend` - React application
- `/backend` - Flask API server
- `/backend/app.py` - Main Flask application
- `/frontend/src/App.tsx` - Main React component

## Contributing

Feel free to submit issues and enhancement requests!
