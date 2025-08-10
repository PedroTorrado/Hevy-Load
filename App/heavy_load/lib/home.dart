import 'package:flutter/material.dart';

class HomePage extends StatelessWidget {
  final VoidCallback onToggleTheme;
  final bool isDark;

  const HomePage({Key? key, required this.onToggleTheme, required this.isDark}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hevy-Load'),
        actions: [
          IconButton(
            tooltip: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
            onPressed: onToggleTheme,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 16),
            Text(
              'Hevy-Load',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.primary,
                letterSpacing: 1.2,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Track and visualize your workout progress',
              style: TextStyle(
                fontSize: 18,
                color: Theme.of(context).textTheme.bodyMedium?.color,
                fontWeight: FontWeight.w500,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ExerciseCard(title: 'Bench Press', color: Colors.blue),
            const SizedBox(height: 16),
            ExerciseCard(title: 'Squat', color: Colors.green),
            const SizedBox(height: 16),
            ExerciseCard(title: 'Deadlift', color: Colors.red),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class ExerciseCard extends StatelessWidget {
  final String title;
  final Color color;

  const ExerciseCard({
    required this.title,
    required this.color,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final double cardWidth = MediaQuery.of(context).size.width * 0.9;
    final double cardHeight = 180;

    return Center(
      child: Card(
        elevation: 4,
        color: color.withOpacity(0.15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: SizedBox(
          width: cardWidth,
          height: cardHeight,
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ),
      ),
    );
  }
}