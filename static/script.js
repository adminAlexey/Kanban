sessionStorage.setItem('username', '22170424')
const savedUser = sessionStorage.getItem('username');
console.log(savedUser);
var actualBoardId = null;

// Функция создания карточки
async function createCard(id, title, description, dueDate, assignee, priority) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.classList.add('task-card');
    card.draggable = true;
    card.dataset.id = id;

    // Контейнер для приоритета (кружочек)
    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = 'priority-indicator';
    priorityIndicator.style.backgroundColor = getPriorityColor(priority);

    // Заголовок задачи
    const titleElement = document.createElement('h3');
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

// Функция инициализации перетаскивания
function initDragAndDrop() {
    const columns = document.querySelectorAll('.column');

    columns.forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault(); // Разрешаем перетаскивание
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const afterElement = getDragAfterElement(column, e.clientY);
                if (afterElement == null) {
                    column.appendChild(draggingCard);
                } else {
                    column.insertBefore(draggingCard, afterElement);
                }
            }
        });

        column.addEventListener('drop', () => {
            const draggingCard = document.querySelector('.dragging');
            if (draggingCard) {
                const taskId = draggingCard.dataset.id;
                const columnId = column.dataset.columnId; // Получаем статус из dataset
                updateTaskInDB(taskId, columnId, null, null, null, null, null); // Обновляем статус задачи в базе данных
            }
        });
    });

    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('card')) {
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', e => {
        if (e.target.classList.contains('card')) {
            e.target.classList.remove('dragging');
        }
    });
}

// Функция для обновления задачи в базе данных
async function updateTaskInDB(id, columnID, title, description, dueDate, assignee_id, priority) {
    try {
        const data = {
            id: id,
            column_id: columnID,
            title: title,
            description: description,
            due_date: dueDate,
            assignee_id: assignee_id,
            priority: priority
        };
        console.log('Updating task with ID:', id, 'Data:', data);

        const response = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Task updated successfully:', result);

    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Функция для добавления новой карточки
async function fillBoard(board_id) {
    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';

    try {
        const response = await fetch('/fill_boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board_id: board_id })
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const board_info = await response.json();

        for (const column of board_info) {
            const columnDiv = document.createElement('div');
            const newTitle = column.title.replace(/\s+/g, '-').toLowerCase();
            columnDiv.classList.add(`${newTitle}-column`, 'column', 'cards');
            columnDiv.dataset.columnId = column.id;
            columnDiv.dataset.columnTitle = column.title;
            columnDiv.innerHTML = `<h3>${column.title}</h3>`;

            // Добавляем задачи
            for (const task of column.tasks) {
                const card = await createCard(task.id, task.title, task.description, task.due_date, task.assignee, task.priority);
                columnDiv.appendChild(card);
            }

            columnList.appendChild(columnDiv);
        }

        // === ИНИЦИАЛИЗАЦИЯ DRAG AND DROP ===
        initDragAndDrop();

    } catch (error) {
        console.error('Error adding task:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    const projectList = document.getElementById('project-list');
    // Запрос к бэкенду за списком досок
    const response = await fetch(`/load_boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: savedUser
        }),

    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const boards = await response.json();
    for (const board of boards) {
        const listItem = document.createElement('li');
        listItem.classList.add('board-item');
        listItem.textContent = board.name;
        listItem.dataset.boardId = board.id;
        listItem.dataset.boardOwnerId = board.owner_id;

        listItem.addEventListener('click', async function () {
            actualBoardId = listItem.dataset.boardId;
            // console.log("actualBoardId", typeof actualBoardId, actualBoardId); // выводим ID доски в консоль
            fillBoard(actualBoardId);
        });
        projectList.appendChild(listItem);
    }

    // инициализация компонентов
    const usernameDisplay = document.getElementById('username-display');
    usernameDisplay.textContent = sessionStorage.getItem('username');
    // const loginForm = document.getElementById('login-form');
    // const loginModal = document.getElementById('login-modal');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    // модальное окно добавления задачи
    const taskForm = document.getElementById('task-form');
    const modalNewTask = document.getElementById('modal-new-task');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeTaskBtn = document.getElementById('close-task-modal');
    // открытие модального окна задачи
    addTaskBtn.addEventListener('click', () => {
        modalNewTask.style.display = 'flex';
    })
    // Закрытие модального окна задачи
    closeTaskBtn.addEventListener('click', () => {
        modalNewTask.style.display = 'none';
    });

    // Отправка формы
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title-task').value;
        const description = document.getElementById('description').value;
        const dueDate = document.getElementById('due-date').value;
        const assignee = document.getElementById('assignee').value;
        const priority = priorityInput.value;

        try {
            const response = await fetch('/add_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: savedUser,
                    assignee: '22170424',
                    title,
                    description,
                    due_date: dueDate,
                    priority: priority,
                    project_id: actualBoardId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const task = await response.json();

            // const card = await createCard(task.id, task.title, task.description, task.due_date, task.assignee, task.priority);
            // const column = document.getElementsByClassName('backlog-column')[0];
            // column.appendChild(card);

            modalNewTask.style.display = 'none'; // Закрытие модального окна
            taskForm.reset(); // Очистка формы
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    // модальное окно добавления доски
    const boardForm = document.getElementById('board-form');
    const modalNewDask = document.getElementById('modal-new-board');
    const addDaskBtn = document.getElementById('add-board-btn');
    const closeDaskBtn = document.getElementById('close-board-modal');
    // открытие модального окна задачи
    addDaskBtn.addEventListener('click', () => {
        modalNewDask.style.display = 'flex';
    })
    // Закрытие модального окна задачи
    closeDaskBtn.addEventListener('click', () => {
        modalNewDask.style.display = 'none';
    });

    // Отправка формы
    boardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title-board').value;

        try {
            const response = await fetch('/add_board', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: savedUser,
                    board_name: title
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const board = await response.json();
            modalNewDask.style.display = 'none'; // Закрытие модального окна
            taskForm.reset(); // Очистка формы
        } catch (error) {
            console.error('Error adding board:', error);
        }
    });

    // окно входа
    // if (loginForm && !savedUser) {
    //     loginModal.style.display = 'flex';
    //     loginForm.addEventListener('submit', async function (e) {
    //         e.preventDefault();

    //         const formData = new FormData(loginForm);
    //         const data = Object.fromEntries(formData);

    //         try {
    //             const response = await fetch('/login', {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json'
    //                 },
    //                 body: JSON.stringify(data)
    //             });

    //             const result = await response.json();

    //             if (result.success) {
    //                 // Сохраняем имя в UI
    //                 sessionStorage.setItem('username', data.username);
    //                 usernameDisplay.textContent = sessionStorage.getItem('username');

    //                 // Скрываем модальное окно
    //                 document.getElementById('login-modal').style.display = 'none';
    //             } else {
    //                 alert(result.message || 'Ошибка входа');
    //             }
    //         } catch (error) {
    //             console.error('Ошибка:', error);
    //             alert('Не удалось подключиться к серверу');
    //         }
    //     });
    // }

    window.addEventListener('click', (event) => {
        if (event.target === modalNewTask) {
            modalNewTask.style.display = 'none';
        }
        if (event.target === modalNewDask) {
            modalNewDask.style.display = 'none';
        }
    });

    // Выбор приоритета
    priorityButtons.forEach(button => {
        button.addEventListener('click', () => {
            priorityButtons.forEach(btn => btn.style.border = 'none'); // Сброс границ
            button.style.border = '4px solid black'; // Выделение выбранного
            priorityInput.value = button.dataset.priority; // Сохранение значения
        });
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
