import 'package:flutter/material.dart';
import 'package:heavy_load/models/enums.dart';
import 'package:heavy_load/services/database_service.dart';

import 'models/todo.dart';

class databasetest extends StatelessWidget {
  final List<Todo> todos;

  databasetest({Key? key, required this.todos}) : super(key: key);
  // remove the "get todo => null;"

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Database Test'),
      ),
      body: SafeArea(
          child: SizedBox.expand(
        child: _buildUI(),
      )),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addOrEditTodo(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildUI() {
    return Padding(
      padding: EdgeInsets.symmetric(
        horizontal: 16.0,
        vertical: 8.0,
      ),
      child: ListView.builder(
          itemCount: todos.length,
          itemBuilder: (context, index) {
            return Card(
              margin: const EdgeInsets.symmetric(vertical: 2.5),
              child: ListTile(
                title: Text(todos[index].content ?? 'No Content'),
                subtitle: Text(
                  "Status: ${todos[index].status.name}\nCreated At: ${todos[index].createdAt.day}/${todos[index].createdAt.month}, ${todos[index].createdAt.hour}:${todos[index].createdAt.minute}\nUpdated At: ${todos[index].updatedAt.day}/${todos[index].updatedAt.month}, ${todos[index].updatedAt.hour}:${todos[index].updatedAt.minute}",
                ),
                trailing: SizedBox(
                  width: 100,
                  child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit),
                          onPressed: () {
                            _addOrEditTodo(context, todo: todos[index]);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete),
                          color: Colors.red,
                          onPressed: () {
                            DatabaseService.db.writeTxn(() async {
                              await DatabaseService.db.todos.delete(
                                todos[index].id,
                              );
                            });
                            // Optionally, you can refresh the UI or show a snackbar  
                          },
                        ),
                      ]),
                ),
              ),
            );
          }),
    );
  }

  void _addOrEditTodo(BuildContext context, {Todo? todo}) {
    TextEditingController contentController = TextEditingController(text: todo?.content ?? '');
    Status status = todo?.status ?? Status.pending;

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(todo != null ? "Edit To-Do" : "Add To-Do"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
            TextField(controller: contentController, decoration: const InputDecoration(labelText: 'Content'),),
            DropdownButtonFormField<Status>(
                value: status,
                items: Status.values
                    .map((e) => DropdownMenuItem(
                        value: e,
                        child: Text(
                          e.name,
                        )))
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  status = value;
                }),
          ]),
          actions: [
            TextButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: const Text('Cancel')),
            TextButton(
                onPressed: () async {
                  if (contentController.text.isNotEmpty) {
                    
                    late Todo newTodo;
                    if (todo != null) {
                      newTodo = todo.copyWith(
                        content: contentController.text,
                        status: status,
                      );
                    } else {
                      newTodo = Todo()
                        ..content = contentController.text
                        ..status = status;
                    }
                    await DatabaseService.db.writeTxn(() async {
                      await DatabaseService.db.todos.put(
                        newTodo
                      );
                    },);
                    Navigator.pop(context);
                  }
                },
                child: const Text('Save')),
          ],
        );
      },
    );
  }
}
