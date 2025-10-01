import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'dart:io' show Platform;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:heavy_load/services/database_service.dart';
import 'package:heavy_load/models/workout.dart';
import 'package:flutter_markdown/flutter_markdown.dart'; // Import the new package

// The API key will be loaded from a .env file at runtime.
// Ensure you create a file at `lib/.env` with a line like: API_KEY=your_api_key_here

late final GenerativeModel model;

class DashboardPage extends StatefulWidget {
  const DashboardPage({Key? key}) : super(key: key);

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  List<Workout> recentWorkouts = [];
  String _promptText = '';
  String _responseText = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Load environment variables first, then continue initialization.
    _initAsync();
  }

  Future<void> _initAsync() async {
    // Load .env from the lib/ folder by default. Adjust path if you place it elsewhere.
    await dotenv.load(fileName: 'lib/.env');

    final apiKey = dotenv.env['API_KEY'] ?? '';

    // Initialize the model with the API key loaded from .env
    // Use a supported model code. Prefer a model code that includes the
    // 'models/' prefix, or the shorter name which the SDK will normalize.
    // 'models/gemini-flash-latest' is available according to ListModels.
    model = GenerativeModel(
      apiKey: apiKey,
      model: 'models/gemini-flash-latest',
    );

    await _loadAndGeneratePrompt();
  }

  Future<void> _loadAndGeneratePrompt() async {
    setState(() {
      _isLoading = true;
    });

    final allData = await DatabaseService.getAllWorkouts();

    // Sort by date in descending order and take the first 200 entries
    allData.sort((a, b) => b.date!.compareTo(a.date!));
    recentWorkouts = allData.take(200).toList();

    // Use a method to format the data into a clear, structured prompt
    _promptText = _formatWorkoutDataForAI(recentWorkouts);

    // Automatically generate a response when the page loads
    await _generateResponse(_promptText);

    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _generateResponse(String prompt) async {
    if (prompt.isEmpty) {
      setState(() {
        _responseText = 'No data to analyze.';
      });
      return;
    }

    try {
      final content = [Content.text(prompt)];
      final response = await model.generateContent(content);

      if (response.text != null) {
        setState(() {
          _responseText = response.text!;
        });
      } else {
        setState(() {
          _responseText = 'No response generated.';
        });
      }
    } catch (e) {
      setState(() {
        _responseText = 'Error: $e';
      });
    }
  }

  // Method to format your workout data for the AI
  String _formatWorkoutDataForAI(List<Workout> workouts) {
    if (workouts.isEmpty) {
      return '';
    }

    final promptHeader = """
You are a professional and highly experienced strength coach with a deep understanding of progressive overload and periodization. Your goal is to act as my personal AI assistant, helping me improve my training.

**My primary fitness goal is: Strength Training and Muscle Hypertrophy.**

---

**Instructions:**
1.  **Analysis:** Provide a detailed analysis of my workout data. Identify clear trends, my strongest lifts, and specific areas where I can improve. Comment on my consistency and application of progressive overload.
2.  **Workout Plan:** Based on my goal and past performance, generate a **specific workout plan for my next session**.
3.  **Routine Advice:** I am currently doing a Push/Pull/Legs (PPL) routine. Based on my data, provide a clear recommendation on whether I should continue with PPL or switch to an Upper/Lower or full-body split, and justify your suggestion.

---

**Output Format:**
Present the full response using Markdown.
* Start with a brief, encouraging summary of my progress.
* Present the **Workout Plan** as a clean Markdown table with the exact columns: **Exercise**, **Sets**, **Reps**, **Suggested Weight (kg)**. The suggested weights must be based on my performance to ensure a progressive overload stimulus.
* After the table, provide the **Routine Advice** as a bulleted list.

---

**Data:**
""";

    final formattedData = workouts.map((w) {
      final date = w.date != null ? "${w.date!.year}-${w.date!.month}-${w.date!.day}" : "N/A";
      final exercise = w.exercise ?? "N/A";
      final reps = w.reps ?? "N/A";
      final weight = w.weight != null ? "${w.weight} kg" : "N/A";

      return "Date: $date, Exercise: $exercise, Weight: $weight, Reps: $reps";
    }).join('\n');

    return promptHeader + formattedData;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Workout Assistant')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: MarkdownBody(
                data: _responseText,
              ),
            ),
    );
  }
}