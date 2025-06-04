# Workout Data Visualization

A web application for visualizing workout data from CSV files.

## Prerequisites

### MongoDB Setup (using Podman)

1. Install Podman (if not already installed):
   ```bash
   sudo dnf install -y podman
   ```

2. Run MongoDB in a container:
   ```bash
   podman run -d --name mongodb -p 27017:27017 -v mongodb_data:/data/db mongo:latest
   ```

3. Verify MongoDB is running:
   ```bash
   podman ps
   ```

4. To stop MongoDB:
   ```bash
   podman stop mongodb
   ```

5. To start MongoDB again:
   ```bash
   podman start mongodb
   ```

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

## Data Storage

The application uses MongoDB to store workout data. The database is local to your machine and is not included in the GitHub repository. When deploying the application:

1. Install MongoDB on the deployment server
2. Configure MongoDB connection settings in your environment variables
3. Ensure MongoDB service is running before starting the application

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
