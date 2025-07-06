sessionStorage.setItem('username', '22170424')
const savedUser = sessionStorage.getItem('username');
console.log(savedUser);
var actualBoardId = sessionStorage.getItem('actualBoardId');

// Функция создания карточки
async function createCard(id, title, description, dueDate, assignee, priority, columnTitle) {
    priority = parseInt(priority);
    const card = document.createElement('div');
    card.classList.add('card');
    card.draggable = true;
    card.dataset.id = id;
    
    let borderColor;

    if (priority === 1) {
        borderColor = '#00ff00'; // низкий
    } else if (priority === 2) {
        borderColor = '#fff700'; // средний
    } else {
        borderColor = '#ff0000'; // высокий
    }

    // Контейнер для заголовка и названия
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    // Контейнер для приоритета (кружочек)
    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = 'priority-indicator';
    priorityIndicator.style.backgroundColor = borderColor;

    // Заголовок задачи
    const titleElement = document.createElement('h3');
    titleElement.className = 'card-title';
    titleElement.textContent = title;

    cardHeader.appendChild(priorityIndicator);
    cardHeader.appendChild(titleElement);

    // Описание задачи
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'card-description';
    descriptionElement.textContent = description || 'No description';

    // Дата исполнения
    const dueDateElement = document.createElement('div');
    dueDateElement.className = 'card-due-date';
    dueDateElement.textContent = `До: ${dueDate}`;

    // Проверка даты исполнения
    const today = new Date();
    today.setHours(0, 0, 0, 0); // обнуляем время для честного сравнения

    // Представим, что dueDate — строка в формате 'YYYY-MM-DD'
    const taskDueDate = new Date(dueDate); // преобразуем строку в объект Date
    if (taskDueDate < today && columnTitle !== 'Done') { // Временное решение с названием столбца заменить на порядковый номер?
        dueDateElement.classList.add('overdue'); // Применяем класс для выделения
    }

    // Ответственный
    const assigneeElement = document.createElement('div');
    assigneeElement.className = 'card-assignee';
    assigneeElement.textContent = `Исполнитель: ${assignee}`;

    // Сборка карточки
    card.appendChild(cardHeader);
    // card.appendChild(priorityIndicator);
    // card.appendChild(titleElement);
    card.appendChild(descriptionElement);
    card.appendChild(assigneeElement);
    card.appendChild(dueDateElement);

    card.style.borderLeft = `2px solid ${borderColor}`;

    return card;
}

// Функция инициализации перетаскивания
function initDragAndDrop() {
    const columns = document.querySelectorAll('.cards');

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

        const response = await fetch(`/api/task/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        // console.log('Updating task with ID:', id, 'Data:', data);
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Функция для добавления новой карточки
async function updateBoardTask(board_id) {
    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';

    try {
        const response = await fetch(`/api/board/${board_id}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const board_info = await response.json();

        for (const column of board_info) {
            const outerColumn = document.createElement('div');
            outerColumn.classList.add('column')

            const columnDiv = document.createElement('div');
            const newTitle = column.title.replace(/\s+/g, '-').toLowerCase();
            columnDiv.classList.add(`${newTitle}-column`, 'cards');
            columnDiv.dataset.columnId = column.id;
            columnDiv.dataset.columnTitle = column.title;
            outerColumn.innerHTML = `<h3 class="column-header">${column.title}</h3>`;

            // Добавляем задачи
            for (const task of column.tasks) {
                const card = await createCard(task.id, task.title, task.description, task.due_date, task.assignee, task.priority, column.title);
                columnDiv.appendChild(card);
            }
            outerColumn.appendChild(columnDiv)
            // outerColumn.appendChild(document.createElement('br'))

            // columnList.appendChild(columnDiv);
            columnList.appendChild(outerColumn)
        }

        // === ИНИЦИАЛИЗАЦИЯ DRAG AND DROP ===
        initDragAndDrop();

    } catch (error) {
        console.error('Error adding task:', error);
    }
}

async function updateBoardList() {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = ''

    const response = await fetch(`/api/boards`, {
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
            sessionStorage.setItem('actualBoardId', actualBoardId);
            updateBoardTask(actualBoardId);
        });
        projectList.appendChild(listItem);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    updateBoardList();

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

    // Отобразить актуальный список пользователей в канбан доске
    taskForm.addEventListener('click', async (e) => {
        const response = await fetch(`/api/users/${actualBoardId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        users = data.users;
        // console.log('users: ', users, typeof users);
        selectOption = document.querySelector('.select-options');
        selectOption.innerHTML = '';
        for (const user of users) {
            option = document.createElement('div');
            option.className = 'option';
            option.innerHTML = user.username
            option.dataset.priority = user.id
            
            option.addEventListener('click', function () {
                const value = this.getAttribute('data-value');
                const selectedText = this.textContent;

                document.querySelector('.select-button').textContent = selectedText;

                // Скрываем опции после выбора
                document.querySelector('.select-options').style.display = 'none';
            });

            selectOption.appendChild(option)
        }
    })

    // Отправка формы
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title-task').value;
        const description = document.getElementById('description').value;
        const dueDate = document.getElementById('due-date').value;
        // const assignee = document.getElementById('assignee').value;
        const priority = priorityInput.value;

        try {
            const response = await fetch('/api/task', {
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
            // console.log('dueDate', task.due_date, 'type of', typeof task.due_date)

            const column = document.getElementsByClassName('backlog-column')[0];
            const card = await createCard(task.id, task.title, task.description, dueDate, task.assignee, task.priority, column.title);
            column.appendChild(card);
            console.log('check_color:', task.priority)

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
            const response = await fetch('/api/board', {
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

            modalNewDask.style.display = 'none'; // Закрытие модального окна
            boardForm.reset(); // Очистка формы
        } catch (error) {
            console.error('Error adding board:', error);
        }
        updateBoardList();
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

    // Закрытие модальных окон
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
    
    document.querySelector('.select-button').addEventListener('click', function () {
        const options = document.querySelector('.select-options');
        options.style.display = options.style.display === 'block' ? 'none' : 'block';
    });

    // загрузка последней доски
    updateBoardTask(actualBoardId);
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
        case 1:
            return 'green';
        case 2:
            return 'yellow';
        case 3:
            return 'red';
        default:
            return 'gray';
    }
}
