# Backend

## Overview

The backend of the Workout Data Visualization application is built using Flask and MongoDB. It provides APIs for uploading workout data, retrieving exercises, and fetching workout data for visualization.

## Setup

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

## Usage

- **Upload Data**: Use the `/api/upload` endpoint to upload a CSV file with workout data.
- **Get Exercises**: Use the `/api/exercises` endpoint to retrieve a list of unique exercises.
- **Get Workouts**: Use the `/api/workouts` endpoint to fetch workout data, optionally filtered by exercise.

## Key Features

- **Data Validation**: Validates workout data to ensure integrity before storing in MongoDB.
- **Error Handling**: Provides detailed error messages and logging for debugging.
- **MongoDB Integration**: Uses MongoDB for persistent storage of workout data.

## Technologies Used

- **Flask**: For building the API server.
- **MongoDB**: For data storage.
- **Pandas**: For data processing and CSV handling.
- **Python-dotenv**: For environment variable management. 