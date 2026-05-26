const taskForm = document.getElementById("taskForm");
const taskNameInput = document.getElementById("taskName");
const taskPriorityInput = document.getElementById("taskPriority");
const deleteBtn = document.getElementById("deleteBtn");
const resetBtn = document.getElementById("resetBtn");
const heapTree = document.getElementById("heapTree");
const naiveTree = document.getElementById("naiveTree");
const heapArray = document.getElementById("heapArray");
const naiveArray = document.getElementById("naiveArray");
const stepsList = document.getElementById("stepsList");
const message = document.getElementById("message");
const deleteModal = document.getElementById("deleteModal");
const deleteHeapBtn = document.getElementById("deleteHeapBtn");
const deleteNaiveBtn = document.getElementById("deleteNaiveBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const heapTop = document.getElementById("heapTop");
const naiveTop = document.getElementById("naiveTop");
const addedCount = document.getElementById("addedCount");
const heapRemainingCount = document.getElementById("heapRemainingCount");
const naiveRemainingCount = document.getElementById("naiveRemainingCount");

const heapInsert = document.getElementById("heapInsert");
const naiveInsert = document.getElementById("naiveInsert");
const heapDelete = document.getElementById("heapDelete");
const naiveDelete = document.getElementById("naiveDelete");

async function sendRequest(url, payload = {}) {
    // All operations use JSON so the Flask backend and JavaScript stay simple.
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }
    return data;
}

async function loadState() {
    const response = await fetch("/api/state");
    const data = await response.json();
    renderAll(data);
}

function renderAll(data) {
    renderHeapTree(data.heap);
    renderNaiveTree(data.naive);
    renderArray(heapArray, data.heap, "Heap array is empty.");
    renderArray(naiveArray, data.naive, "Naive array is empty.");
    renderDashboard(data.top, data.stats);
    renderSteps(data.steps);
    renderComplexities(data.complexities);
}

function getPriorityClass(level) {
    if (level === "high") {
        return "high-priority";
    }
    if (level === "medium") {
        return "medium-priority";
    }
    return "low-priority";
}

function createTaskNode(task, x, y) {
    const node = document.createElement("div");
    node.className = `task-node ${getPriorityClass(task.level)}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    const title = document.createElement("strong");
    title.textContent = task.name;

    const priority = document.createElement("small");
    priority.textContent = `Priority ${task.priority}`;

    node.appendChild(title);
    node.appendChild(priority);
    return node;
}

function createEdge(x1, y1, x2, y2) {
    // Edges are thin rotated divs between parent and child nodes.
    const edge = document.createElement("div");
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    edge.className = "edge";
    edge.style.width = `${length}px`;
    edge.style.left = `${x1}px`;
    edge.style.top = `${y1}px`;
    edge.style.transform = `rotate(${angle}deg)`;
    return edge;
}

function showEmpty(container, text) {
    container.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = text;
    container.appendChild(empty);
}

function renderArray(container, tasks, emptyText) {
    container.innerHTML = "";

    if (tasks.length === 0) {
        const empty = document.createElement("span");
        empty.className = "array-empty";
        empty.textContent = emptyText;
        container.appendChild(empty);
        return;
    }

    tasks.forEach((task, index) => {
        const cell = document.createElement("div");
        cell.className = `array-cell ${getPriorityClass(task.level)}`;

        const indexLabel = document.createElement("small");
        indexLabel.textContent = `Index ${index}`;

        const taskLabel = document.createElement("strong");
        taskLabel.textContent = `${task.name} (${task.priority})`;

        cell.appendChild(indexLabel);
        cell.appendChild(taskLabel);
        container.appendChild(cell);
    });
}

function formatTask(task) {
    if (!task) {
        return "Empty";
    }
    return `${task.name} (${task.priority})`;
}

function renderDashboard(top, stats) {
    heapTop.textContent = formatTask(top.heap);
    naiveTop.textContent = formatTask(top.naive);
    addedCount.textContent = stats.added;
    heapRemainingCount.textContent = stats.heapRemaining;
    naiveRemainingCount.textContent = stats.naiveRemaining;
}

function renderHeapTree(tasks) {
    if (tasks.length === 0) {
        showEmpty(heapTree, "Heap is empty. Add a task to see the tree.");
        return;
    }

    heapTree.innerHTML = "";
    const canvas = document.createElement("div");
    canvas.className = "tree-canvas";

    const canvasWidth = Math.max(520, tasks.length * 120);
    canvas.style.width = `${canvasWidth}px`;

    const positions = tasks.map((task, index) => {
        const level = Math.floor(Math.log2(index + 1));
        const firstIndexAtLevel = (2 ** level) - 1;
        const indexInsideLevel = index - firstIndexAtLevel;
        const nodesAtLevel = 2 ** level;
        const gap = canvasWidth / (nodesAtLevel + 1);

        return {
            task,
            x: gap * (indexInsideLevel + 1) - 59,
            y: 24 + level * 92,
        };
    });

    positions.forEach((position, index) => {
        if (index === 0) {
            return;
        }
        const parentIndex = Math.floor((index - 1) / 2);
        const parent = positions[parentIndex];
        canvas.appendChild(
            createEdge(parent.x + 59, parent.y + 66, position.x + 59, position.y)
        );
    });

    positions.forEach((position) => {
        canvas.appendChild(createTaskNode(position.task, position.x, position.y));
    });

    heapTree.appendChild(canvas);
}

function renderNaiveTree(tasks) {
    if (tasks.length === 0) {
        showEmpty(naiveTree, "Naive list is empty. Add a task to see insertion order.");
        return;
    }

    naiveTree.innerHTML = "";
    const canvas = document.createElement("div");
    canvas.className = "tree-canvas";

    const canvasWidth = Math.max(620, tasks.length * 150);
    canvas.style.width = `${canvasWidth}px`;

    tasks.forEach((task, index) => {
        const x = 28 + index * 145;
        const y = index % 2 === 0 ? 96 : 194;

        if (index > 0) {
            const previousX = 28 + (index - 1) * 145;
            const previousY = (index - 1) % 2 === 0 ? 96 : 194;
            canvas.appendChild(createEdge(previousX + 118, previousY + 33, x, y + 33));
        }

        canvas.appendChild(createTaskNode(task, x, y));
    });

    naiveTree.appendChild(canvas);
}

function renderSteps(steps) {
    stepsList.innerHTML = "";

    steps.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        stepsList.appendChild(item);
    });
}

function renderComplexities(complexities) {
    heapInsert.textContent = complexities.heapInsertion;
    naiveInsert.textContent = complexities.naiveInsertion;
    heapDelete.textContent = complexities.heapDeletion;
    naiveDelete.textContent = complexities.naiveDeletion;
}

taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    try {
        const data = await sendRequest("/api/add", {
            name: taskNameInput.value,
            priority: taskPriorityInput.value,
        });
        renderAll(data);
        taskForm.reset();
        taskNameInput.focus();
    } catch (error) {
        message.textContent = error.message;
    }
});

function openDeleteModal() {
    message.textContent = "";
    deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
    deleteModal.classList.add("hidden");
}

async function deleteUsingMethod(method) {
    message.textContent = "";
    const data = await sendRequest("/api/delete", { method });
    renderAll(data);
    closeDeleteModal();
}

deleteBtn.addEventListener("click", openDeleteModal);

deleteHeapBtn.addEventListener("click", async () => {
    try {
        await deleteUsingMethod("heap");
    } catch (error) {
        message.textContent = error.message;
        closeDeleteModal();
    }
});

deleteNaiveBtn.addEventListener("click", async () => {
    try {
        await deleteUsingMethod("naive");
    } catch (error) {
        message.textContent = error.message;
        closeDeleteModal();
    }
});

cancelDeleteBtn.addEventListener("click", closeDeleteModal);

deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
});

resetBtn.addEventListener("click", async () => {
    message.textContent = "";
    const data = await sendRequest("/api/reset");
    renderAll(data);
    taskNameInput.focus();
});

loadState();
