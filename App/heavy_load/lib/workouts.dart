import 'package:flutter/material.dart';

class WorkoutsPage extends StatelessWidget {
  const WorkoutsPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Workouts'),
      ),
      body: const Center(
        child: Text(
          'Workouts Content Here',
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}