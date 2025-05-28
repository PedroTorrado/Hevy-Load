import pandas as pd

# Read the CSV file
df = pd.read_csv('workouts.csv')

# Convert start_time and end_time to readable date format if they look like timestamps
for col in ['start_time', 'end_time']:
    if col in df.columns:
        # Try to parse with the known format first
        df[col] = pd.to_datetime(df[col], format='%d %b %Y, %H:%M', errors='coerce')
        # If any are still NaT, try generic parsing as fallback
        mask = df[col].isna()
        if mask.any():
            df.loc[mask, col] = pd.to_datetime(df.loc[mask, col], errors='coerce')
        # Format as string after all .dt operations
        if df[col].notna().any():
            if (df[col].dt.hour.fillna(0).eq(0).all() and df[col].dt.minute.fillna(0).all()):
                df[col] = df[col].dt.strftime('%Y-%m-%d')
            else:
                df[col] = df[col].dt.strftime('%Y-%m-%d %H:%M')

# Identify numeric columns for graphing
graphable_columns = ['weight_kg', 'reps', 'distance_km', 'duration_seconds', 'rpe']

# Get all columns for X-axis selection
all_columns = df.columns.tolist()

# Get unique exercises for the filter dropdown
exercise_list = sorted(df['exercise_title'].dropna().unique())

# Generate HTML table
html_table = df.to_html(index=False, table_id="workoutsTable", classes="display nowrap", escape=False)

# HTML template with DataTables and Chart.js
html_content = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Workout Data Viewer</title>
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/jquery.dataTables.min.css">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        #chart-container {{ 
            width: 95vw; 
            max-width: 1200px; 
            height: 600px;  /* Increased height */
            margin: 40px auto; 
        }}
        table.dataTable {{ width: 100% !important; }}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.3.1/dist/chartjs-adapter-luxon.umd.min.js"></script>
</head>
<body>
    <h1>Workout Data Viewer</h1>
    <div>
        <label for="exerciseSelect">Filter by exercise:</label>
        <select id="exerciseSelect">
            <option value="All">All Exercises</option>
            {''.join([f'<option value="{ex}">{ex}</option>' for ex in exercise_list])}
        </select>
    </div>
    <div style="margin-top: 20px;">
        <label for="xAxisSelect">X axis:</label>
        <select id="xAxisSelect">
            {''.join([f'<option value="{col}">{col}</option>' for col in all_columns])}
        </select>
        <label for="yAxisSelect">Y axis:</label>
        <select id="yAxisSelect">
            {''.join([f'<option value="{col}">{col}</option>' for col in graphable_columns])}
        </select>
        <select id="chartType">
            <option value="line">Line</option>
            <option value="bar">Bar</option>
            <option value="scatter">Scatter</option>
        </select>
        <label style="margin-left: 20px;">
            <input type="checkbox" id="evenDateSpacing"> Show even date spacing
        </label>
    </div>
    <div id="chart-container">
        <canvas id="workoutChart"></canvas>
    </div>
    <label style="margin-left:20px;">
        <input type="checkbox" id="topSetOnly"> Show only top set (highest weight per date & exercise)
    </label>
    {html_table}
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        var table;
        $(document).ready(function() {{
            table = $('#workoutsTable').DataTable({{
                scrollX: true,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
                pageLength: 25,
                order: [[0, 'desc']]  // Sort by first column (usually date) by default
            }});

            // Exercise filter
            $('#exerciseSelect').on('change', function() {{
                applyFilters();
                updateChart();
            }});

            // Top set filter
            $('#topSetOnly').on('change', function() {{
                applyFilters();
                updateChart();
            }});

            // Initial chart update
            updateChart();
        }});

        function applyFilters() {{
            var val = $('#exerciseSelect').val();
            var colIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === 'exercise_title'; }}).index();
            if (val === 'All') {{
                table.column(colIdx).search('').draw();
            }} else {{
                // Use exact match for exercise filtering
                table.column(colIdx).search('^' + val.replace(/[.*+?^${{}}()|[\\]\\\\]/g, '\\\\$&') + '$', true, false).draw();
            }}
            // Hide all rows, then show only top sets if checked
            if ($('#topSetOnly').is(':checked')) {{
                showOnlyTopSets();
            }} else {{
                $('#workoutsTable tbody tr').show();
            }}
        }}

        function showOnlyTopSets() {{
            var dateIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === 'start_time'; }}).index();
            var exIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === 'exercise_title'; }}).index();
            var weightIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === 'weight_kg'; }}).index();
            var rows = $('#workoutsTable tbody tr:visible');
            var topSetMap = {{}};
            rows.each(function() {{
                var cells = $(this).find('td');
                var date = cells.eq(dateIdx).text();
                var ex = cells.eq(exIdx).text();
                var weight = parseFloat(cells.eq(weightIdx).text());
                var key = date + '||' + ex;
                if (!(key in topSetMap) || weight > topSetMap[key].weight) {{
                    topSetMap[key] = {{ row: this, weight: weight }};
                }}
            }});
            rows.hide();
            Object.values(topSetMap).forEach(function(obj) {{
                $(obj.row).show();
            }});
        }}

        function parseDate(dateStr) {{
            if (!dateStr) return null;
            // Try parsing with known format first (YYYY-MM-DD HH:mm)
            var date = new Date(dateStr);
            if (isNaN(date.getTime())) {{
                // Try parsing with just the date part
                date = new Date(dateStr.split(' ')[0]);
            }}
            return isNaN(date.getTime()) ? null : date;
        }}

        function getXYData(xCol, yCol) {{
            var xData = [];
            var yData = [];
            var actualDates = [];  // Track actual dates of data points
            var xIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === xCol; }}).index();
            var yIdx = $('#workoutsTable thead th').filter(function() {{ return $(this).text() === yCol; }}).index();
            
            // First, collect all valid data points
            $('#workoutsTable tbody tr:visible').each(function() {{
                var cells = $(this).find('td');
                var xVal = cells.eq(xIdx).text();
                var yVal = parseFloat(cells.eq(yIdx).text());
                if (!isNaN(yVal) && xVal !== '') {{
                    xData.push(xVal);
                    yData.push(yVal);
                    actualDates.push(xVal);
                }}
            }});
            
            // Sort data by date if xCol is a date column
            if (xCol === 'start_time' || xCol === 'end_time') {{
                // Sort the data points by date
                var sortedData = xData.map((x, i) => ({{
                    x: x,
                    y: yData[i],
                    date: new Date(x)
                }})).sort((a, b) => a.date - b.date);
                
                xData = sortedData.map(d => d.x);
                yData = sortedData.map(d => d.y);
                actualDates = sortedData.map(d => d.x);

                // If even date spacing is enabled
                if ($('#evenDateSpacing').is(':checked')) {{
                    if (xData.length > 0) {{
                        var startDate = new Date(xData[0]);
                        var endDate = new Date(xData[xData.length - 1]);
                        var allDates = [];
                        var currentDate = new Date(startDate);
                        
                        // Create a map of existing data points
                        var dataMap = new Map();
                        xData.forEach((date, index) => {{
                            dataMap.set(date.split(' ')[0], {{
                                value: yData[index],
                                actualDate: actualDates[index]
                            }});
                        }});
                        
                        // Generate all dates in range
                        while (currentDate <= endDate) {{
                            var dateStr = currentDate.toISOString().split('T')[0];
                            allDates.push(dateStr);
                            currentDate.setDate(currentDate.getDate() + 1);
                        }}
                        
                        // Create new arrays with all dates
                        var newXData = [];
                        var newYData = [];
                        var newActualDates = [];
                        
                        allDates.forEach(date => {{
                            newXData.push(date);
                            if (dataMap.has(date)) {{
                                var data = dataMap.get(date);
                                newYData.push(data.value);
                                newActualDates.push(data.actualDate);
                            }} else {{
                                newYData.push(null);
                                newActualDates.push(null);
                            }}
                        }});
                        
                        xData = newXData;
                        yData = newYData;
                        actualDates = newActualDates;
                    }}
                }}
            }}
            
            return {{ x: xData, y: yData, actualDates: actualDates }};
        }}

        var chart = null;  // Initialize chart variable

        function updateChart() {{
            var xCol = $('#xAxisSelect').val();
            var yCol = $('#yAxisSelect').val();
            var type = $('#chartType').val();
            var xyData = getXYData(xCol, yCol);

            // Destroy existing chart if it exists
            if (chart) {{
                chart.destroy();
            }}

            var ctx = document.getElementById('workoutChart').getContext('2d');
            
            // Calculate segment colors based on time gaps
            var segmentColors = [];
            if (xCol === 'start_time' || xCol === 'end_time') {{
                // Get all valid data points with their dates
                var validPoints = xyData.actualDates.map((date, i) => ({{
                    date: new Date(date),
                    value: xyData.y[i]
                }})).filter(point => point.value !== null);
                
                // Calculate gaps between consecutive points
                for (var i = 1; i < validPoints.length; i++) {{
                    var prevDate = validPoints[i-1].date;
                    var currDate = validPoints[i].date;
                    var diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                    segmentColors.push(diffDays > 7 ? 'rgba(255, 0, 0, 0.5)' : 'rgba(54, 162, 235, 0.5)');
                }}
            }}

            var chartConfig = {{
                type: type === 'scatter' ? 'scatter' : type,
                data: {{
                    labels: type === 'scatter' ? undefined : xyData.x,
                    datasets: [{{
                        label: yCol + ' vs ' + xCol,
                        data: type === 'scatter' ? xyData.x.map((x, i) => ({{ 
                            x: xCol === 'start_time' || xCol === 'end_time' ? new Date(x).getTime() : parseFloat(x), 
                            y: xyData.y[i] 
                        }})) : xyData.y,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: function(context) {{
                            if (type === 'scatter') return 'rgba(54, 162, 235, 1)';
                            var index = context.dataIndex;
                            if (index < segmentColors.length) {{
                                return segmentColors[index];
                            }}
                            return 'rgba(54, 162, 235, 1)';
                        }},
                        borderWidth: 2,
                        fill: false,
                        showLine: type !== 'scatter',
                        spanGaps: true,
                        segment: {{
                            borderColor: function(context) {{
                                if (type === 'scatter') return 'rgba(54, 162, 235, 1)';
                                return segmentColors[context.p0DataIndex] || 'rgba(54, 162, 235, 1)';
                            }}
                        }}
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{ display: true }}
                    }},
                    scales: {{
                        x: type === 'scatter' ? {{ 
                            title: {{ display: true, text: xCol }}, 
                            type: 'linear',
                            position: 'bottom'
                        }} : {{ 
                            title: {{ display: true, text: xCol }},
                            ticks: {{
                                maxRotation: 45,
                                minRotation: 45
                            }}
                        }},
                        y: {{ 
                            beginAtZero: true, 
                            title: {{ display: true, text: yCol }},
                            suggestedMin: 0,
                            suggestedMax: function() {{
                                var max = Math.max(...xyData.y.filter(y => y !== null));
                                return max * 1.1;  // Add 10% padding to the top
                            }}()
                        }}
                    }}
                }}
            }};

            chart = new Chart(ctx, chartConfig);
        }}

        $('#xAxisSelect, #yAxisSelect, #chartType, #evenDateSpacing').on('change', updateChart);
    </script>
</body>
</html>
'''

with open('workouts.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('workouts.html generated! Open it in your browser.') 