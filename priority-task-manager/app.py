from flask import Flask, jsonify, render_template, request
import heapq


app = Flask(__name__)

# Stores tasks in heap order. Python's heapq is a min-heap by default.
# To make it work like a max-heap, we store negative priority values.
heap_queue = []

# Stores tasks exactly in the order they were added. This represents the
# naive priority queue where we search manually during deletion.
naive_queue = []

# A counter is used to keep task order stable when two tasks have same priority.
task_counter = 0
add_count = 0
heap_delete_count = 0
naive_delete_count = 0


def make_task(task_id, name, priority):
    """Create one common task dictionary used by both visualizations."""
    return {
        "id": task_id,
        "name": name,
        "priority": priority,
        "level": get_priority_level(priority),
    }


def get_priority_level(priority):
    """Convert a priority number into a UI color category."""
    if priority >= 8:
        return "high"
    if priority >= 4:
        return "medium"
    return "low"


def serialize_heap():
    """Return heap tasks in array order so the frontend can draw a heap tree."""
    return [entry[2] for entry in heap_queue]


def serialize_naive():
    """Return naive tasks in insertion order."""
    return naive_queue


def get_heap_top():
    """Return the root task of the max-heap."""
    if not heap_queue:
        return None
    return heap_queue[0][2]


def get_naive_top():
    """Find the highest-priority task in the naive queue by linear search."""
    if not naive_queue:
        return None
    return max(naive_queue, key=lambda task: task["priority"])


def find_naive_highest_priority():
    """Search naive queue one by one and return best index plus explanation."""
    best_index = 0
    naive_steps = []

    for index, task in enumerate(naive_queue):
        naive_steps.append(
            f"Naive check {index + 1}: compare '{task['name']}' (priority {task['priority']}) "
            f"with current best '{naive_queue[best_index]['name']}' "
            f"(priority {naive_queue[best_index]['priority']})."
        )
        if task["priority"] > naive_queue[best_index]["priority"]:
            best_index = index
            naive_steps.append(
                f"Naive update: '{task['name']}' is now the best task because {task['priority']} is larger."
            )

    return best_index, naive_steps


def current_state(extra_steps=None):
    """Build the JSON response sent after every operation."""
    return {
        "heap": serialize_heap(),
        "naive": serialize_naive(),
        "top": {
            "heap": get_heap_top(),
            "naive": get_naive_top(),
        },
        "stats": {
            "added": add_count,
            "heapDeleted": heap_delete_count,
            "naiveDeleted": naive_delete_count,
            "heapRemaining": len(heap_queue),
            "naiveRemaining": len(naive_queue),
        },
        "steps": extra_steps or [],
        "complexities": {
            "heapInsertion": "O(log n)",
            "naiveInsertion": "O(1)",
            "heapDeletion": "O(log n)",
            "naiveDeletion": "O(n)",
        },
    }


@app.route("/")
def index():
    """Render the main web page."""
    return render_template("index.html")


@app.route("/api/state", methods=["GET"])
def state():
    """Send current queue state when the page loads."""
    return jsonify(current_state([
        "System ready. Add a task to compare heap and naive priority queues."
    ]))


@app.route("/api/add", methods=["POST"])
def add_task():
    """Add one task into both priority queue implementations."""
    global task_counter, add_count

    data = request.get_json()
    task_name = data.get("name", "").strip()
    priority_text = data.get("priority", "")

    if not task_name:
        return jsonify({"error": "Task name is required."}), 400

    try:
        priority = int(priority_text)
    except (TypeError, ValueError):
        return jsonify({"error": "Priority must be a whole number."}), 400

    if priority < 1:
        return jsonify({"error": "Priority must be 1 or greater."}), 400

    task_counter += 1
    add_count += 1
    task = make_task(task_counter, task_name, priority)

    # heapq normally removes the smallest value first. By storing -priority,
    # the largest original priority behaves like the top item of a max-heap.
    # The counter avoids comparison errors when priorities are equal.
    heapq.heappush(heap_queue, (-priority, task_counter, task))

    # The naive queue simply appends. It does not rearrange after insertion.
    naive_queue.append(task)

    steps = [
        f"Add Task: '{task_name}' with priority {priority}.",
        "Heap insertion: put the task at the next open position in the heap array.",
        "Max-heap insertion: store negative priority internally, then heapq swaps upward until the largest priority is at the top.",
        "Naive insertion: append the task at the end of the list without sorting.",
        "Result: max-heap may rearrange itself, while naive list keeps insertion order.",
    ]

    return jsonify(current_state(steps))


@app.route("/api/delete", methods=["POST"])
def delete_highest_priority_task():
    """Remove the highest-priority task using the selected method."""
    global heap_delete_count, naive_delete_count

    if not heap_queue or not naive_queue:
        return jsonify(current_state([
            "Delete requested, but both queues are empty.",
            "Add at least one task before deleting the highest-priority task.",
        ]))

    data = request.get_json(silent=True) or {}
    method = data.get("method", "heap")

    if method == "heap":
        # Max-heap deletion removes the largest priority number from root.
        removed_task = heapq.heappop(heap_queue)[2]
        heap_delete_count += 1

        steps = [
            "Delete method selected: Heap Method.",
            "In a max-heap, the highest-priority task is already stored at the root.",
            f"Heap deletion: heapq.heappop() removed '{removed_task['name']}' with priority {removed_task['priority']}.",
            "Heap deletion: the last heap node moved to root, then heapq swapped it downward to restore max-heap order.",
            "Only the heap structure changed. The naive list is kept unchanged so you can compare both methods independently.",
        ]
    elif method == "naive":
        # Naive deletion checks each task until it finds the largest priority.
        best_index, naive_steps = find_naive_highest_priority()
        removed_task = naive_queue.pop(best_index)
        naive_delete_count += 1

        steps = [
            "Delete method selected: Naive Method.",
            "Naive deletion: scan the unsorted list from left to right.",
            *naive_steps,
            f"Naive deletion: removed '{removed_task['name']}' with priority {removed_task['priority']}.",
            "Only the naive list changed. The heap is kept unchanged so you can compare both methods independently.",
        ]
    else:
        return jsonify({"error": "Choose either heap or naive delete method."}), 400

    return jsonify(current_state(steps))


@app.route("/api/reset", methods=["POST"])
def reset():
    """Clear both queues and restart task IDs."""
    global task_counter, add_count, heap_delete_count, naive_delete_count

    heap_queue.clear()
    naive_queue.clear()
    task_counter = 0
    add_count = 0
    heap_delete_count = 0
    naive_delete_count = 0

    return jsonify(current_state([
        "Reset complete. Heap queue and naive queue are now empty.",
    ]))


if __name__ == "__main__":
    app.run(debug=True)
