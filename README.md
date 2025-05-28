# Workout Data Visualization (Proof of Concept)

This is a proof of concept script that demonstrates how workout data can be visualized using Python and modern web technologies. The script takes workout data from a CSV file and generates an interactive HTML page with data visualization capabilities.

## Features

- Converts workout data from CSV to an interactive web interface
- Interactive data table with sorting and filtering capabilities
- Dynamic chart generation with multiple visualization options:
  - Line charts
  - Bar charts
  - Scatter plots
- Exercise-specific filtering
- Option to show only top sets per exercise
- Date-based visualization with configurable spacing
- Automatic gap detection in workout history

## Data Source

The script works with workout data exported from Hevy.com:
1. Log into your Hevy.com account
2. Go to Settings > Export Data
3. Download your workout data as CSV
4. Place the downloaded `workouts.csv` file in the same directory as the script

The script expects the CSV to contain the following data from Hevy:
- Workout dates and times
- Exercise names
- Weight used (in kg)
- Number of reps
- Distance (for cardio exercises)
- Duration (for timed exercises)
- RPE (Rate of Perceived Exertion) if recorded

The visualization will automatically adapt to show the available data from your Hevy export.

## Technical Implementation

The proof of concept uses:
- Python with pandas for data processing
- DataTables for interactive table functionality
- Chart.js for dynamic data visualization
- Luxon for advanced date handling
- Modern JavaScript for interactive features

## Usage

1. Ensure you have a `workouts.csv` file with your workout data
2. Run the script:
   ```bash
   python generate_workouts_html.py
   ```
3. Open the generated `workouts.html` file in your web browser

## Note

This is a proof of concept implementation and may require additional features, error handling, and optimization for production use. The current implementation focuses on demonstrating the core visualization capabilities and interactive features.

## Dependencies

- Python 3.x
- pandas and numpy (install using `pip install -r requirements.txt`)
- A modern web browser with JavaScript enabled

## Installation

1. Clone or download this repository
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Follow the Usage instructions above to run the script
