from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
import traceback
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27018/'))
db = client['workout_tracker']
workouts_collection = db['workouts']

def validate_workout(workout):
    """Validate workout data and handle NaN values."""
    try:
        # Convert NaN values to None for MongoDB compatibility
        for key, value in workout.items():
            if pd.isna(value) or (isinstance(value, float) and np.isnan(value)):
                workout[key] = None

        # Ensure required fields are present and have valid types
        if not workout.get('start_time'):
            return False, "Missing start_time"
        
        if not workout.get('exercise_title'):
            return False, "Missing exercise_title"
        
        # Convert numeric fields, handling None values
        for field in ['weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe']:
            if field in workout and workout[field] is not None:
                try:
                    workout[field] = float(workout[field])
                except (ValueError, TypeError):
                    workout[field] = None

        return True, workout
    except Exception as e:
        logger.error(f"Error validating workout: {str(e)}")
        return False, str(e)

@app.route('/api/workouts', methods=['GET'])
def get_workouts():
    try:
        exercise = request.args.get('exercise', 'All')
        logger.info(f"Fetching workouts for exercise: {exercise}")
        
        query = {} if exercise == 'All' else {'exercise_title': exercise}
        logger.info(f"Using query: {query}")
        
        workouts = list(workouts_collection.find(query, {'_id': 0}))
        logger.info(f"Retrieved {len(workouts)} workouts from database")
        
        # Validate workouts before sending
        valid_workouts = []
        for workout in workouts:
            is_valid, result = validate_workout(workout)
            if is_valid:
                valid_workouts.append(result)
            else:
                logger.warning(f"Invalid workout data: {result}")
        
        logger.info(f"Returning {len(valid_workouts)} valid workouts")
        return jsonify(valid_workouts)
    except Exception as e:
        logger.error(f"Error getting workouts: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    try:
        exercises = workouts_collection.distinct('exercise_title')
        logger.info(f"Retrieved {len(exercises)} unique exercises")
        return jsonify(exercises)
    except Exception as e:
        logger.error(f"Error getting exercises: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_workouts():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'File must be a CSV'}), 400

        # Read CSV file
        df = pd.read_csv(file)
        logger.info(f"Read {len(df)} rows from CSV file")
        logger.info(f"CSV columns: {df.columns.tolist()}")

        # Convert DataFrame to records
        workouts = df.to_dict('records')
        logger.info(f"Converted {len(workouts)} rows to workout records")

        # Validate and clean workouts
        valid_workouts = []
        for workout in workouts:
            is_valid, result = validate_workout(workout)
            if is_valid:
                valid_workouts.append(result)
            else:
                logger.warning(f"Invalid workout data: {result}")

        if not valid_workouts:
            return jsonify({'error': 'No valid workouts found in the file'}), 400

        # Clear existing workouts and insert new ones
        workouts_collection.delete_many({})
        result = workouts_collection.insert_many(valid_workouts)
        
        logger.info(f"Successfully inserted {len(result.inserted_ids)} workouts")
        return jsonify({'message': f'Successfully uploaded {len(result.inserted_ids)} workouts'})

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0') 