from flask import Flask, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import pandas as pd
from datetime import datetime
import os
from dotenv import load_dotenv
import logging
import traceback
import numpy as np
import time
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from bson import ObjectId

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Handle proxy headers
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Set secret key for session management
app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(16))

# MongoDB connection with retry logic
def get_mongo_client(max_retries=5, retry_delay=5):
    retries = 0
    while retries < max_retries:
        try:
            client = MongoClient(
                os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'),
                serverSelectionTimeoutMS=5000,  # 5 second timeout
                connectTimeoutMS=5000
            )
            # Test the connection
            client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            return client
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            retries += 1
            if retries == max_retries:
                logger.error(f"Failed to connect to MongoDB after {max_retries} attempts: {str(e)}")
                raise
            logger.warning(f"Failed to connect to MongoDB (attempt {retries}/{max_retries}): {str(e)}")
            time.sleep(retry_delay)

# Initialize MongoDB connection
try:
    client = get_mongo_client()
    db = client['workout_tracker']
    workouts_collection = db['workouts']
except Exception as e:
    logger.error(f"Failed to initialize MongoDB connection: {str(e)}")
    raise

# Users collection
users_collection = db['users']

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    hevy_username = data.get('hevy_username')
    gemini_api_key = data.get('gemini_api_key')  # Optional
    if not email or not password or not hevy_username:
        return jsonify({'error': 'Email, password, and Hevy username are required'}), 400
    if users_collection.find_one({'email': email}):
        return jsonify({'error': 'Email already registered'}), 400
    password_hash = generate_password_hash(password)
    user = {
        'email': email,
        'password_hash': password_hash,
        'hevy_username': hevy_username,
        'gemini_api_key': gemini_api_key or None
    }
    users_collection.insert_one(user)
    return jsonify({'message': 'User registered successfully'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    user = users_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
    session['user_id'] = str(user['_id'])
    session['email'] = user['email']
    session['hevy_username'] = user['hevy_username']
    return jsonify({'message': 'Logged in successfully'})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/set_gemini_key', methods=['POST'])
@login_required
def set_gemini_key():
    data = request.get_json()
    gemini_api_key = data.get('gemini_api_key')
    if not gemini_api_key:
        return jsonify({'error': 'Gemini API key is required'}), 400
    user_id = session['user_id']
    result = users_collection.update_one({'_id': ObjectId(user_id)}, {'$set': {'gemini_api_key': gemini_api_key}})
    if result.modified_count == 1:
        return jsonify({'message': 'Gemini API key updated successfully'})
    else:
        return jsonify({'error': 'Failed to update Gemini API key'}), 500

@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    include_key = request.args.get('include_key') == 'true'
    user = users_collection.find_one({'email': session.get('email')})
    data = {
        'email': user.get('email'),
        'hevy_username': user.get('hevy_username'),
    }
    if include_key:
        data['gemini_api_key'] = user.get('gemini_api_key')
    return jsonify(data)

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

@app.route('/api/user/workouts', methods=['GET'])
@login_required
def get_workouts():
    try:
        user_id = session.get('user_id')
        exercise = request.args.get('exercise', 'All')
        logger.info(f"Fetching workouts for exercise: {exercise} and user: {user_id}")
        query = {'user_id': user_id}
        if exercise != 'All':
            query['exercise_title'] = exercise
        logger.info(f"Using query: {query}")
        workouts = list(workouts_collection.find(query, {'_id': 0, 'user_id': 0}))
        logger.info(f"Retrieved {len(workouts)} workouts from database for user {user_id}")
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

@app.route('/api/user/upload', methods=['POST'])
@login_required
def upload_workouts():
    try:
        user_id = session.get('user_id')
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
                result['user_id'] = user_id  # Associate workout with user
                valid_workouts.append(result)
            else:
                logger.warning(f"Invalid workout data: {result}")
        if not valid_workouts:
            return jsonify({'error': 'No valid workouts found in the file'}), 400
        # Remove only this user's workouts before inserting new ones
        workouts_collection.delete_many({'user_id': user_id})
        result = workouts_collection.insert_many(valid_workouts)
        logger.info(f"Successfully inserted {len(result.inserted_ids)} workouts for user {user_id}")
        return jsonify({'message': f'Successfully uploaded {len(result.inserted_ids)} workouts'})
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    # Use environment variables for configuration
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    # Get the protocol from environment or default to http
    protocol = os.getenv('FLASK_PROTOCOL', 'http')
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        ssl_context=('ssl/nginx-selfsigned.crt', 'ssl/nginx-selfsigned.key') if protocol == 'https' else None
    ) 