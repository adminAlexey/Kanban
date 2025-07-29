document.getElementById('settings-btn').addEventListener('click', () => {
    window.location.href = '/settings';
});

document.getElementById('notifications-btn').addEventListener('click', () => {
    window.location.href = '/notifications';
});

localStorage.setItem('username', '22170424') // для удобства тестирования
const savedUser = localStorage.getItem('username');
var actualBoardId = localStorage.getItem('actualBoardId');
var lastBoardId = localStorage.getItem('lastBoardId');

const sidebar = document.getElementById('sidebar');

let isDragging = false;

// Блок переменных для проверки изменений карточки
let globalTitle = '';
let globalDescription = '';
let globalAssignee = '';

async function updateTaskOnBoard (id, currentTitle, currentDescription, currentAssignee) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    const title = card.querySelector('h3');
    const description = card.querySelector('.card-description');
    const assignee = card.querySelector('.card-assignee');

    title.textContent = currentTitle;
    assignee.innerHTML = "Исполнитель: " + currentAssignee;
    description.innerHTML = currentDescription;
}

/**
 * Проверяет, были ли изменены данные задачи в модальном окне.
 * Если изменений нет, обновляет задачу в базе данных.
 *
 * @param {HTMLElement} modalEditTask — элемент модального окна задачи
 */
async function checkUpdateTask(modalEditTask) {
    // Получаем текущие значения из модального окна
    const currentTaskId = modalEditTask.dataset.cardID;
    const currentTitle   = modalEditTask.querySelector('.card-title').textContent;
    const currentDescription = modalEditTask.querySelector('.card-description').innerText;
    const currentAssignee = modalEditTask.querySelector('#selected-assignee').innerHTML;

    // Сравниваем с сохранёнными глобальными значениями
    const isСhanged =
        // globalId !== currentTaskId ||
        globalTitle !== currentTitle ||
        globalDescription !== currentDescription ||
        globalAssignee !== currentAssignee;

    // Если данные не изменились — обновляем задачу в БД
    if (isСhanged) {
        // TODO: Проверить, assignee_id и assignee
        updateTaskInDB(currentTaskId, null, currentTitle, currentDescription, null, currentAssignee, null);
        updateTaskOnBoard(currentTaskId, currentTitle, currentDescription, currentAssignee);
    }
}

// Функция для обновления задачи в базе данных
async function updateTaskInDB(id, columnID, title, description, dueDate, assignee, priority) {
    try {
        const data = {
            id: id,
            column_id: columnID,
            title: title,
            description: description,
            due_date: dueDate,
            assignee: assignee,
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
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Загрузка элемента DOM
document.addEventListener('DOMContentLoaded', async function () {
    function updateColumnCounters() {
        document.querySelectorAll('.column').forEach(col => {
            const cardsContainer = col.querySelector('.cards');
            const counter = col.querySelector('.header-with-counter h5');
            if (counter && cardsContainer) {
                const count = cardsContainer.querySelectorAll('.card').length;
                counter.textContent = count;
            }
        });
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
                isDragging = true;
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', e => {
            if (e.target.classList.contains('card')) {
                isDragging = false;
                e.target.classList.remove('dragging');
                updateColumnCounters();
            }
        });
    }

    // Функция обновления списка досок
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

            buttonDeleteBoard = document.createElement('button');
            buttonDeleteBoard.classList.add('delete-board-btn');
            buttonDeleteBoard.innerHTML = 'X'

            buttonDeleteBoard.addEventListener('click', async function (e) {
                e.stopPropagation(); // ❗ Останавливаем всплытие события
                try {
                    const response = await fetch(`/api/board/${parseInt(board.id)}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    } else {
                        updateBoardList();
                        if (actualBoardId !== lastBoardId) {
                            updateBoardTask(lastBoardId);
                        }
                    }
                } catch (error) {
                    console.error('Error deleting board:', error);
                }
            })
            
            listItem.appendChild(buttonDeleteBoard);

            listItem.addEventListener('click', async function () {
                if (parseInt(actualBoardId) !== parseInt(board.id)) {
                    lastBoardId = actualBoardId;
                    localStorage.setItem('lastBoardId', lastBoardId);
                }
                actualBoardId = parseInt(board.id);
                localStorage.setItem('actualBoardId', actualBoardId);
                updateBoardTask(actualBoardId);
            });
            projectList.appendChild(listItem);
        }
    }
    function sortColumnTasks(columnElement, sortBy, order) {
        const cards = Array.from(columnElement.querySelectorAll('.card'));
        const isAsc = order === 'asc';

        cards.sort((a, b) => {
            let valA, valB;

            if (sortBy === 'title') {
                valA = a.querySelector('.card-title').textContent.toLowerCase();
                valB = b.querySelector('.card-title').textContent.toLowerCase();
            } else if (sortBy === 'due_date') {
                const dateA = new Date(a.querySelector('.card-due-date').textContent.replace('До: ', ''));
                const dateB = new Date(b.querySelector('.card-due-date').textContent.replace('До: ', ''));
                valA = dateA;
                valB = dateB;
            } else if (sortBy === 'priority') {
                valA = parseInt(a.dataset.priority) || 0;
                valB = parseInt(b.dataset.priority) || 0;
            } else {
                return 0; // default — без сортировки
            }

            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });

        // 🔥 Удаляем все карточки и добавляем отсортированные
        // Это быстрее, чем менять порядок по одной
        cards.forEach(card => columnElement.appendChild(card));
    }

    // === ФУНКЦИЯ ОБНОВЛЕНИЯ ДОСКИ ===
    async function updateBoardTask(board_id) {
        try {
            // 1. Загружаем данные
            const board_info = await fetchBoardData(board_id);
            if (!board_info) return;

            // 2. Очищаем старую доску
            const columnList = document.getElementById('column-list');
            columnList.innerHTML = '';

            // 3. Создаём колонки
            for (const column of board_info) {
                const columnElement = createColumn(column, board_id);
                columnList.appendChild(columnElement);
            }

            // 4. Добавляем колонку "Добавить"
            const addColumn = createButtonAddColumn();
            columnList.appendChild(addColumn);

            // 5. Инициализация
            initDragAndDrop();

        } catch (error) {
            console.error('Error updating board:', error);
        }
    }

    async function fetchBoardData(board_id) {
        try {
            const response = await fetch(`/api/board/${board_id}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching board data:', error);
            return null;
        }
    }

    function createColumn(column, board_id) {
        const outerColumn = document.createElement('div');
        outerColumn.classList.add('column');

        const columnDiv = document.createElement('div');
        const cleanTitle = column.title.replace(/\s+/g, '-').toLowerCase();
        columnDiv.classList.add(`${cleanTitle}-column`, 'cards');
        columnDiv.dataset.columnId = column.id;
        columnDiv.dataset.columnTitle = column.title;

        // Заголовок с сортировкой
        const header = createColumnHeader(column, columnDiv, board_id);
        outerColumn.appendChild(header);
        outerColumn.appendChild(columnDiv);

        // Добавляем карточки
        const sortedTasks = sortTasks(column.tasks, board_id, column.id);
        sortedTasks.forEach(task => {
            createCard(task.id, task.title, task.description, task.due_date, task.assignee, task.priority, column.title)
                .then(card => columnDiv.appendChild(card));
        });

        return outerColumn;
    }

    function createColumnHeader(column, columnDiv, board_id) {
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('column-header');

        const headerWithCounter = document.createElement('div');
        headerWithCounter.className = 'header-with-counter';

        const titleElement = document.createElement('h3');
        titleElement.textContent = column.title;
        titleElement.contentEditable = true;

        const counter = document.createElement('h5');
        counter.textContent = column.tasks.length;

        headerWithCounter.appendChild(titleElement);
        headerWithCounter.appendChild(counter);

        // === КНОПКА СОРТИРОВКИ ===
        const sortButton = document.createElement('button');
        sortButton.className = 'sort-btn';
        sortButton.dataset.columnId = column.id;
        sortButton.dataset.boardId = board_id;

        // Загружаем сохранённое состояние
        const sortKey = `${board_id}-${column.id}`;
        const saved = JSON.parse(localStorage.getItem('columnSort') || '{}')[sortKey] || { sortBy: 'default', order: 'asc' };
        sortButton.dataset.sortBy = saved.sortBy;
        sortButton.dataset.order = saved.order;

        updateSortButtonUI(sortButton); // Визуальное отображение

        // Обработчик клика
        sortButton.addEventListener('click', () => {
            const btn = sortButton;
            const current = { sortBy: btn.dataset.sortBy, order: btn.dataset.order };
            const next = getNextSortState(current);

            btn.dataset.sortBy = next.sortBy;
            btn.dataset.order = next.order;
            updateSortButtonUI(btn);

            // Сохраняем
            const state = JSON.parse(localStorage.getItem('columnSort') || '{}');
            state[sortKey] = { sortBy: next.sortBy, order: next.order };
            localStorage.setItem('columnSort', JSON.stringify(state));

            // Пересортируем
            sortColumnTasks(columnDiv, next.sortBy, next.order);
        });

        headerDiv.appendChild(headerWithCounter);
        headerDiv.appendChild(sortButton);
        return headerDiv;
    }

    function getNextSortState(current) {
        const cycle = [
            { sortBy: 'default', order: 'asc' },
            { sortBy: 'title', order: 'asc' },
            { sortBy: 'title', order: 'desc' },
            { sortBy: 'due_date', order: 'asc' },
            { sortBy: 'due_date', order: 'desc' },
            { sortBy: 'priority', order: 'asc' },
            { sortBy: 'priority', order: 'desc' }
        ];

        const currentIndex = cycle.findIndex(s => s.sortBy === current.sortBy && s.order === current.order);
        const nextIndex = (currentIndex + 1) % cycle.length;
        return cycle[nextIndex];
    }

    function sortTasks(tasks, board_id, column_id) {
        const sortKey = `${board_id}-${column_id}`;
        const saved = JSON.parse(localStorage.getItem('columnSort') || '{}')[sortKey] || { sortBy: 'default', order: 'asc' };
        const { sortBy, order } = saved;

        if (sortBy === 'default') return tasks;

        const isAsc = order === 'asc';
        return [...tasks].sort((a, b) => {
            let valA, valB;

            if (sortBy === 'title') {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
            } else if (sortBy === 'due_date') {
                valA = new Date(a.due_date);
                valB = new Date(b.due_date);
            } else if (sortBy === 'priority') {
                valA = a.priority;
                valB = b.priority;
            } else {
                return 0;
            }

            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });
    }

    function sortColumnTasks(columnElement, sortBy, order) {
        const cards = Array.from(columnElement.querySelectorAll('.card'));
        if (sortBy === 'default') return;

        const isAsc = order === 'asc';
        cards.sort((a, b) => {
            let valA, valB;

            if (sortBy === 'title') {
                valA = a.querySelector('.card-title').textContent.toLowerCase();
                valB = b.querySelector('.card-title').textContent.toLowerCase();
            } else if (sortBy === 'due_date') {
                const textA = a.querySelector('.card-due-date').textContent.replace('До: ', '');
                const textB = b.querySelector('.card-due-date').textContent.replace('До: ', '');
                valA = new Date(textA);
                valB = new Date(textB);
            } else if (sortBy === 'priority') {
                valA = parseInt(a.dataset.priority) || 0;
                valB = parseInt(b.dataset.priority) || 0;
            } else {
                return 0;
            }

            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });

        cards.forEach(card => columnElement.appendChild(card));
    }

    function updateSortButtonUI(button) {
        const sortBy = button.dataset.sortBy;
        const order = button.dataset.order;
        let symbol = '⇅';

        if (sortBy === 'title') symbol = order === 'asc' ? 'A↑' : 'A↓';
        else if (sortBy === 'due_date') symbol = order === 'asc' ? '📅↑' : '📅↓';
        else if (sortBy === 'priority') symbol = order === 'asc' ? '❗↑' : '❗↓';

        button.textContent = symbol;
    }

    async function addColumn() {
        try {
            const response = await fetch('/api/column', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    board_id: actualBoardId,
                    title: 'New Column'
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error adding column:', error);
        }
    }

    function createButtonAddColumn() {
        const outer = document.createElement('div');
        outer.classList.add('column');

        const columnDiv = document.createElement('div');
        columnDiv.classList.add('column-add-column');
        columnDiv.classList.add('column');
        columnDiv.style.width = '5vw';
        columnDiv.dataset.columnId = 0;

        buttonAddColumn = document.createElement('div');
        buttonAddColumn.className = 'add-column-btn';
        buttonAddColumn.innerHTML = '+';

        buttonAddColumn.addEventListener('click', addColumn)

        columnDiv.appendChild(buttonAddColumn);

        const header = document.createElement('div');
        header.classList.add('column-header');

        const title = document.createElement('h3');
        title.textContent = '+';
        header.appendChild(title);

        outer.appendChild(header);
        outer.appendChild(columnDiv);
        return outer;
    }

    // Функция создания карточки
    async function createCard(id, title, description, dueDate, assignee, priority, columnTitle) {
        priority = parseInt(priority);
        const card = document.createElement('div');
        card.classList.add('card');
        card.draggable = true;
        card.dataset.id = id;
        card.dataset.priority = priority;
        
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
        card.appendChild(descriptionElement);
        card.appendChild(assigneeElement);
        card.appendChild(dueDateElement);

        card.style.borderLeft = `2px solid ${borderColor}`;

        card.addEventListener('click', (e) => {
            if (!isDragging) {
                showCardInfo(
                    card.dataset.id,
                    titleElement.textContent, 
                    descriptionElement.textContent, 
                    dueDate,
                    assignee,
                    priority,
                    columnTitle
                );
            }
        });

        return card;
    }

    async function showCardInfo(id, title, description, dueDate, assignee, priority, columnTitle) {     
        const modalEditTask = document.getElementById('modal-edit-task');
        modalEditTask.dataset.cardID = id
        modalEditTask.style.display = 'flex';

        modalEditTask.querySelector('.card-title').textContent = title;
        modalEditTask.querySelector('.card-description').innerText = description;
        modalEditTask.querySelector('.card-due-date').textContent = `Выполнить до: ${dueDate}`;

        loadUsersForTaskForm(
            modalEditTask.querySelector('.custom-select'),
            modalEditTask.querySelector('#selected-assignee'),
            assignee    
        );

        globalTitle = title;
        globalDescription = description;
        globalAssignee = assignee;
    }

    const modalEditTask = document.getElementById('modal-edit-task');

    const listOptions = document.querySelectorAll('.option')
    for (const option of listOptions) {
        option.addEventListener('click', function () {
            if (option.innerHTML === 'Задачу') {
                modalNewTask.style.display = 'flex';
                loadUsersForTaskForm(
                    modalNewTask.querySelector('.custom-select'),
                    modalNewTask.querySelector('#select-assignee'),
                    'Исполнитель'    
                );
            }
            // TODO: Добавить создание колонки
            // else if (option.innerHTML === 'Колонку') {
            //     modalNewColumn.style.display = 'flex';
            // }
            else if (option.innerHTML === 'Доску') {
                modalNewDask.style.display = 'flex';
            }

            // Скрываем опции после выбора
            document.querySelector('.select-options').style.display = 'none';
        });
    }
    
    const listIcons = document.getElementsByClassName('activatable')
    for (const icon of listIcons) {
        icon.addEventListener('click', () => {
            for (const otherIcon of listIcons) {
                otherIcon.classList.remove('active');
            }
            icon.classList.add('active')
        })
    }

    updateBoardList();

    // инициализация компонентов
    // const loginForm = document.getElementById('login-form');
    // const loginModal = document.getElementById('login-modal');
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    // модальное окно добавления задачи
    const taskForm = document.getElementById('task-form');
    const modalNewTask = document.getElementById('modal-new-task');

    // Отправка формы
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = taskForm.querySelector('#title-task').value;
        const description = taskForm.querySelector('#description').value;
        const dueDate = taskForm.querySelector('#due-date').value;
        const assignee = taskForm.querySelector('.select-button').innerHTML;
        const priority = priorityInput.value;

        try {
            const response = await fetch('/api/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner: savedUser,
                    assignee: assignee,
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
            const column = document.getElementsByClassName('backlog-column')[0];
            const card = await createCard(task.id, task.title, task.description, dueDate, task.assignee, task.priority, column.title);
            column.appendChild(card);

            modalNewTask.style.display = 'none';
            taskForm.reset();
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    async function loadUsersForTaskForm(customSelect, selectButton, selectButtonText) {
        selectButton.textContent = selectButtonText;

        const selectOptions = customSelect.querySelector('.select-options');

        const response = await fetch(`/api/users/${actualBoardId}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const users = data.users;

        for (const user of users) {
            const option = document.createElement('div');
            option.className = 'option';
            option.textContent = user.username;
            option.dataset.userId = user.id;

            option.addEventListener('click', function () {
                selectButton.textContent = option.textContent;
                selectOptions.style.display = 'none';
            });

            selectOptions.appendChild(option);
        }
    }

    // модальное окно добавления доски
    const boardForm = document.getElementById('board-form');
    const modalNewDask = document.getElementById('modal-new-board');
    const addDaskBtn = document.getElementById('add-board-btn');
    
    // открытие модального окна задачи
    addDaskBtn.addEventListener('click', () => {
        modalNewDask.style.display = 'flex';
    })

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
    //                 localStorage.setItem('username', data.username);
    //                 usernameDisplay.textContent = localStorage.getItem('username');

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
        if (event.target === modalEditTask) {
            checkUpdateTask(modalEditTask);
            modalEditTask.style.display = 'none';
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
    
    // При выборе элемента выпадающего списка переключить отображение списка
    document.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', function () {
            const options = this.closest('.custom-select')?.querySelector('.select-options');
            options.style.display = options.style.display === 'block' ? 'none' : 'block';
        });
    });

    // Закрытие списка при клике вне списка
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.select-options').forEach(el => {
                el.style.display = 'none';
            });
        }
    });

    // загрузка последней доски
    updateBoardTask(actualBoardId);
    updateColumnCounters();
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

// Управление сайдбаром expand/collapse + hover-режим
const expandCollapseBtn = document.getElementById('expand-collapse');
const projectIcon = document.getElementById('project-icon');
const board = document.querySelector('.kanban-board');
let isExpanded = true;

const savedState = localStorage.getItem('sidebarExpanded');
if (savedState === 'false') {
    isExpanded = false;
    sidebar.classList.add('collapsed');
    board.classList.add('expand');
    expandCollapseBtn.title = 'Развернуть';
} else {
    isExpanded = true;
    sidebar.classList.remove('collapsed');
    board.classList.remove('expand');
    expandCollapseBtn.title = 'Свернуть';
}

// переключение состояния сайдбара
expandCollapseBtn.addEventListener('click', () => {
    sidebar.style.transform = '';

    isExpanded = !isExpanded;
    localStorage.setItem('sidebarExpanded', isExpanded);

    if (isExpanded) {
        sidebar.classList.remove('collapsed');
        board.classList.remove('expand');
        expandCollapseBtn.title = 'Свернуть';
    } else {
        sidebar.classList.add('collapsed');
        board.classList.add('expand');
        expandCollapseBtn.title = 'Развернуть';
    }
});

projectIcon.addEventListener('mouseenter', () => {
    if (!isExpanded) {
        sidebar.style.transition = 'transform 0.3s ease';
        sidebar.style.transform = 'translateX(0)';
    }
});

projectIcon.addEventListener('mouseleave', () => {
    if (!isExpanded) {
        sidebar.style.transform = 'translateX(-100%)';
    }
});

sidebar.addEventListener('mouseenter', () => {
    if (!isExpanded) {
        sidebar.style.transform = 'translateX(0)';
    }
});

sidebar.addEventListener('mouseleave', () => {
    if (!isExpanded) {
        sidebar.style.transform = 'translateX(-100%)';
    }
});
