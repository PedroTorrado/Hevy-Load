import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'dart:io' show Platform;
import 'package:heavy_load/services/database_service.dart';
import 'package:heavy_load/models/workout.dart';
import 'package:flutter_markdown/flutter_markdown.dart'; // Import the new package

// Your API key and model setup from earlier
final apiKey = Platform.environment['AIzaSyBIn795OmiXxYmqiPTeKrWyiAt_F-T9mU4'] ?? '';

final model = GenerativeModel(
  apiKey: "AIzaSyBIn795OmiXxYmqiPTeKrWyiAt_F-T9mU4",
  model: 'gemini-1.5-flash-latest', 
);

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
    _loadAndGeneratePrompt();
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
You are a knowledgeable and professional strength training coach. Your task is to analyze my recent workout data and provide a detailed, actionable workout plan.

**Instructions:**
1.  **Analyze the Data:** I will provide a list of my last 200 sets, including the date, exercise, weight (in kg), and repetitions. Your analysis should focus on identifying my strengths, areas for improvement, and overall progress in strength.
2.  **Summary:** Provide a concise summary of my recent training, noting any trends you see (e.g., progressive overload on specific lifts, consistency, etc.).
3.  **Workout Plan:** Based on my goal of **strength training** and my past performance, generate a **specific workout plan for my next session**.
4.  **Routine Advice:** I was doing a Push/Pull/Legs (PPL) routine but want to ensure my training is balanced. Please provide a recommendation on whether I should continue with PPL or switch to another routine like Upper/Lower or a full-body split, justifying your suggestion based on the provided data.
5.  **Output Format:** Present the workout plan as a **Markdown table** with the following columns: **Exercise**, **Sets**, **Reps**, and **Suggested Weight (kg)**. The suggested weight should be based on my recent performance to ensure a progressive overload stimulus and based on the weight and reps I've been doing.

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