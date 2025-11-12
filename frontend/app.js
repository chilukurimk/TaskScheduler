const API_URL = '/tasks';
let allTasks = [];
let currentTab = 'active';
let currentTaskId = null;
let isEditMode = false;

// Load tasks when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    setupEventHandlers();
});

// Setup all event handlers
function setupEventHandlers() {
    // Task Modal controls
    const modal = document.getElementById('taskModal');
    const btnAdd = document.getElementById('btnAdd');
    const btnClose = document.getElementById('btnCloseModal');
    const btnCancel = document.getElementById('btnCancel');
    
    btnAdd.addEventListener('click', () => openModal());
    btnClose.addEventListener('click', () => closeModal());
    btnCancel.addEventListener('click', () => closeModal());
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Form submission
    const form = document.getElementById('taskForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isEditMode) {
            await updateTask();
        } else {
            await addTask();
        }
    });

    // Details Modal controls
    const detailsModal = document.getElementById('detailsModal');
    const btnCloseDetails = document.getElementById('btnCloseDetails');
    const btnCloseDetailsBottom = document.getElementById('btnCloseDetailsBottom');
    const btnEditTask = document.getElementById('btnEditTask');
    const btnDeleteTask = document.getElementById('btnDeleteTask');
    const btnAddComment = document.getElementById('btnAddComment');
    const commentText = document.getElementById('commentText');
    
    btnCloseDetails.addEventListener('click', () => closeDetailsModal());
    btnCloseDetailsBottom.addEventListener('click', () => closeDetailsModal());
    btnEditTask.addEventListener('click', () => openEditMode());
    btnDeleteTask.addEventListener('click', () => deleteTaskFromDetails());
    btnAddComment.addEventListener('click', () => addComment());
    
    // Keyboard shortcut for adding comment
    commentText.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            addComment();
        }
    });
    
    // Close details modal when clicking outside
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) closeDetailsModal();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// Open modal
function openModal() {
    isEditMode = false;
    currentTaskId = null;
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('btnSubmit').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    
    const modal = document.getElementById('taskModal');
    modal.classList.add('show');
    document.getElementById('taskName').focus();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('show');
    document.getElementById('taskForm').reset();
    isEditMode = false;
    currentTaskId = null;
}

// Open edit mode
function openEditMode() {
    const task = allTasks.find(t => t.id === currentTaskId);
    if (!task) return;
    
    isEditMode = true;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('btnSubmit').textContent = 'Save Changes';
    
    document.getElementById('taskName').value = task.name;
    document.getElementById('taskDate').value = task.date;
    document.getElementById('taskTime').value = task.time;
    document.getElementById('taskDescription').value = task.description || '';
    
    closeDetailsModal();
    
    const modal = document.getElementById('taskModal');
    modal.classList.add('show');
    document.getElementById('taskName').focus();
}

// Open details modal
async function openDetailsModal(taskId) {
    currentTaskId = taskId;
    
    try {
        const response = await fetch(`${API_URL}/${taskId}`);
        const task = await response.json();
        
        document.getElementById('detailTitle').textContent = task.name;
        document.getElementById('detailDescription').textContent = task.description || 'No description';
        document.getElementById('detailStatus').textContent = task.status || 'active';
        
        const createdDate = new Date(task.createdAt);
        const modifiedDate = new Date(task.modifiedAt || task.createdAt);
        
        document.getElementById('detailCreated').textContent = formatDateTime(createdDate);
        document.getElementById('detailModified').textContent = formatDateTime(modifiedDate);
        
        // Display comments
        const comments = task.comments || [];
        document.getElementById('commentCount').textContent = comments.length;
        
        const commentsList = document.getElementById('commentsList');
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">No comments yet. Add one below.</p>';
        } else {
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment-item">
                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                    <div class="comment-date">${formatDateTime(new Date(comment.createdAt))}</div>
                </div>
            `).join('');
        }
        
        document.getElementById('commentText').value = '';
        
        const modal = document.getElementById('detailsModal');
        modal.classList.add('show');
    } catch (error) {
        console.error('Error loading task details:', error);
        showNotification('Failed to load task details', 'error');
    }
}

// Close details modal
function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    modal.classList.remove('show');
    currentTaskId = null;
}

// Format date and time
function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Switch tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Filter and display tasks
    displayTasks(allTasks);
}

// Load and display all tasks
async function loadTasks() {
    try {
        const response = await fetch(API_URL);
        allTasks = await response.json();
        displayTasks(allTasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showNotification('Failed to load tasks', 'error');
    }
}

// Display tasks in the UI
function displayTasks(tasks) {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');

    // Filter tasks based on current tab
    let filteredTasks = tasks;
    const now = new Date();
    
    if (currentTab === 'active') {
        filteredTasks = tasks.filter(task => {
            const taskDate = new Date(`${task.date}T${task.time}`);
            return !task.completed && taskDate >= now;
        });
    } else if (currentTab === 'closed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    // 'all' tab shows everything

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    // Sort tasks by date and time
    filteredTasks.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });

    taskList.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');

    // Add event listeners to task cards
    document.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon')) {
                openDetailsModal(card.dataset.id);
            }
        });
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(button.dataset.id);
        });
    });

    document.querySelectorAll('.btn-complete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleComplete(button.dataset.id);
        });
    });
}

// Create HTML for a task card
function createTaskCard(task) {
    const taskDate = new Date(`${task.date}T${task.time}`);
    const now = new Date();
    
    // Calculate time difference
    const timeDiff = taskDate - now;
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    let timeAgo;
    if (minutesDiff < 0) {
        const absMinutes = Math.abs(minutesDiff);
        if (absMinutes < 60) {
            timeAgo = `${absMinutes} minute${absMinutes !== 1 ? 's' : ''} ago`;
        } else if (Math.abs(hoursDiff) < 24) {
            const hours = Math.abs(hoursDiff);
            timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.abs(daysDiff);
            timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    } else if (minutesDiff < 60) {
        timeAgo = `in ${minutesDiff} minute${minutesDiff !== 1 ? 's' : ''}`;
    } else if (hoursDiff < 24) {
        timeAgo = `in ${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''}`;
    } else if (daysDiff < 7) {
        timeAgo = `in ${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
    } else {
        timeAgo = new Date(task.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }

    const completedClass = task.completed ? 'completed' : '';

    return `
        <div class="task-card ${completedClass}" data-id="${task.id}">
            <div class="task-content">
                <div class="task-name">${escapeHtml(task.name)}</div>
                <div class="task-meta">${timeAgo}</div>
            </div>
            <div class="task-actions">
                <button class="btn-icon btn-complete" data-id="${task.id}" title="Mark as complete">
                    ${task.completed ? '↩️' : '✓'}
                </button>
                <button class="btn-icon btn-delete" data-id="${task.id}" title="Delete task">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Add a new task
async function addTask() {
    const name = document.getElementById('taskName').value.trim();
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;
    const description = document.getElementById('taskDescription').value.trim();

    if (!name || !date || !time) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, date, time, description })
        });

        if (response.ok) {
            showNotification('Task added successfully!', 'success');
            closeModal();
            await loadTasks();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to add task', 'error');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Failed to add task', 'error');
    }
}

// Update an existing task
async function updateTask() {
    const name = document.getElementById('taskName').value.trim();
    const date = document.getElementById('taskDate').value;
    const time = document.getElementById('taskTime').value;
    const description = document.getElementById('taskDescription').value.trim();

    if (!name || !date || !time) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${currentTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, date, time, description })
        });

        if (response.ok) {
            showNotification('Task updated successfully!', 'success');
            closeModal();
            await loadTasks();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update task', 'error');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Failed to update task', 'error');
    }
}

// Add a comment to a task
async function addComment() {
    const text = document.getElementById('commentText').value.trim();
    
    if (!text) {
        showNotification('Please enter a comment', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${currentTaskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            showNotification('Comment added!', 'success');
            await openDetailsModal(currentTaskId); // Refresh the modal
            await loadTasks(); // Refresh the task list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to add comment', 'error');
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

// Delete task from details modal
async function deleteTaskFromDetails() {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${currentTaskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Task deleted successfully!', 'success');
            closeDetailsModal();
            await loadTasks();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// Toggle task completion status
async function toggleComplete(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    
    // Since the backend doesn't support completion status yet, we'll just update locally
    // In a real app, you'd make a PATCH request to the server
    displayTasks(allTasks);
    showNotification(task.completed ? 'Task completed!' : 'Task reopened', 'success');
}

// Delete a task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('Task deleted successfully!', 'success');
            await loadTasks();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 2.5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
