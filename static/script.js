// Функция для добавления новой карточки
async function addCard(status) {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Task', description: 'No description', status }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const task = await response.json();
        // Проверяем, что данные корректны
        if (!task.id || !task.title || !task.status) {
            throw new Error('Invalid task data received from server');
        }
        const card = createCard(task.id, task.title, task.description || 'No description', task.status, task.due_date, task.assignee, task.priority);
        const column = document.getElementById(`${status}-cards`);
        column.appendChild(card);
    } catch (error) {
        console.error('Error adding card:', error);
    }
}

function createCard(id, title, description, status, dueDate, assignee, priority) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = id;

    // Контейнер для приоритета (кружочек)
    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = 'priority-indicator';
    priorityIndicator.style.backgroundColor = getPriorityColor(priority);

    // Заголовок задачи
    const titleElement = document.createElement('div');
    titleElement.className = 'card-title';
    titleElement.textContent = title;

    // Описание задачи
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'card-description';
    descriptionElement.textContent = description || 'No description';

    // Дата исполнения
    const dueDateElement = document.createElement('div');
    dueDateElement.className = 'card-due-date';
    dueDateElement.textContent = `Due: ${dueDate}`;

    // Проверка даты исполнения
    const today = new Date().toISOString().split('T')[0]; // Текущая дата в формате YYYY-MM-DD
    if (dueDate < today) {
        dueDateElement.classList.add('overdue'); // Применяем класс для выделения
    }

    // Ответственный
    const assigneeElement = document.createElement('div');
    assigneeElement.className = 'card-assignee';
    assigneeElement.textContent = `Assignee: ${assignee}`;

    // Сборка карточки
    card.appendChild(priorityIndicator);
    card.appendChild(titleElement);
    card.appendChild(descriptionElement);
    card.appendChild(assigneeElement);
    card.appendChild(dueDateElement);

    return card;
}

// Функция для получения цвета приоритета
function getPriorityColor(priority) {
    switch (priority) {
        case 'low':
            return 'green';
        case 'medium':
            return 'yellow';
        case 'high':
            return 'red';
        default:
            return 'gray';
    }
}

// Функция для обновления задачи в базе данных
async function updateTaskInDB(id, title, description, status) {
    try {
        const data = {};
        if (title !== null) data.title = title;
        if (description !== null) data.description = description;
        if (status !== null) data.status = status;

        console.log('Updating task with ID:', id, 'Data:', data);

        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeBtn = document.querySelector('.close');
    const taskForm = document.getElementById('task-form');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const unDisplay = document.getElementById('username-display');

    // Показываем окно входа при загрузке страницы
    loginModal.style.display = 'flex';

    // Обработка отправки формы входа
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Отображаем логин пользователя в header
        unDisplay.textContent = username;

        console.log('User logged in:', { username, password });

        // Скрываем окно входа
        loginModal.style.display = 'none';

        // Загружаем задачи после входа
        loadTasks();
    });

    // Открытие модального окна
    addTaskBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // Закрытие модального окна
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Выбор приоритета
    priorityButtons.forEach(button => {
        button.addEventListener('click', () => {
            priorityButtons.forEach(btn => btn.style.border = 'none'); // Сброс границ
            button.style.border = '2px solid black'; // Выделение выбранного
            priorityInput.value = button.dataset.priority; // Сохранение значения
        });
    });

    // Отправка формы
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const dueDate = document.getElementById('due-date').value;
        const assignee = document.getElementById('assignee').value;
        const priority = priorityInput.value;

        if (!title || !dueDate || !assignee || !priority) {
            alert('Пожалуйста, заполните все поля.');
            return;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    status: 'todo',
                    due_date: dueDate,
                    assignee,
                    priority
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const task = await response.json();

            const card = createCard(task.id, task.title, task.description, task.status, task.due_date, task.assignee, task.priority);
            const column = document.getElementById('todo-cards');
            column.appendChild(card);

            modal.style.display = 'none'; // Закрытие модального окна
            taskForm.reset(); // Очистка формы
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    const todoCards = document.getElementById('todo-cards');
    const inProgressCards = document.getElementById('in-progress-cards');
    const doneCards = document.getElementById('done-cards');

    // Функция для загрузки задач
    async function loadTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const tasks = await response.json();

            // Очистка колонок
            todoCards.innerHTML = '';
            inProgressCards.innerHTML = '';
            doneCards.innerHTML = '';

            // Распределение задач по колонкам
            tasks.forEach(task => {
                addCardToColumn(task);
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    // Инициализация перетаскивания
    const columns = document.querySelectorAll('.cards');
    columns.forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault(); // Разрешаем перетаскивание
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const afterElement = getDragAfterElement(column, e.clientY);
                if (afterElement == null) {
                    column.appendChild(draggingCard); // Если нет элементов после курсора, добавляем в конец
                } else {
                    column.insertBefore(draggingCard, afterElement); // Вставляем перед найденным элементом
                }
            }
        });

        column.addEventListener('drop', () => {
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const taskId = draggingCard.dataset.id;
                const status = column.parentElement.id; // Получаем статус из ID родительского элемента
                updateTaskInDB(taskId, null, null, status); // Обновляем статус задачи в базе данных
            }
        });
    });

    // Вспомогательная функция для определения позиции при перетаскивании
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2; // Вычисляем смещение относительно центра карточки
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child }; // Находим ближайший элемент выше курсора
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY } // Начальное значение
        ).element;
    }

    // Обработчики событий для карточек
    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('card')) {
            e.target.classList.add('dragging'); // Добавляем класс для перетаскиваемой карточки
        }
    });

    document.addEventListener('dragend', e => {
        if (e.target.classList.contains('card')) {
            e.target.classList.remove('dragging'); // Удаляем класс после завершения перетаскивания
        }
    });

    // Загрузка задач при старте
    loadTasks();
});

// Функция для добавления карточки в колонку
function addCardToColumn(task) {
    const column = document.getElementById(`${task.status}-cards`);
    if (column) {
        const card = createCard(task.id, task.title, task.description || 'No description', task.status, task.due_date, task.assignee, task.priority);
        column.appendChild(card);
    } else {
        console.error(`Column for status "${task.status}" not found.`);
    }
}