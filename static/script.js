sessionStorage.setItem('username', '22170424')
const savedUser = sessionStorage.getItem('username');
console.log(savedUser);
var actualBoardId = null;

// Функция для добавления новой карточки
async function fillBoard(board_id) {
    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';
    try {
        const response = await fetch('/fill_boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                board_id: board_id
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const board_info = await response.json();
        console.log(board_info);
        const columns = board_info;
        for (const column of columns) {
            const columnDiv = document.createElement('div');
            columnDiv.classList.add('column');
            columnDiv.dataset.columnId = column.id;
            columnDiv.dataset.columnTitle = column.title;
            columnDiv.innerHTML = `<h3>${column.title}</h3>`;
            columnList.appendChild(columnDiv);
            
            console.log('column.tasks:', column.tasks);
            for (const task of column.tasks) {
                const taskDiv = document.createElement('div');
                taskDiv.classList.add('task-card');
                taskDiv.dataset.taskId = task.id;
                taskDiv.dataset.columnId = column.id;
                taskDiv.innerHTML = '<h3>' + task.title + '</h3><p>' + task.description + '</p>';
                columnDiv.appendChild(taskDiv);
            }
        }

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
    console.log(boards);
    for (const board of boards) {
        const listItem = document.createElement('li');
        listItem.classList.add('board-item');
        listItem.textContent = board.name;
        listItem.dataset.boardId = board.id;
        listItem.dataset.boardOwnerId = board.owner_id;

        listItem.addEventListener('click', async function () {
            actualBoardId = listItem.dataset.boardId;
            console.log(actualBoardId); // выводим ID доски в консоль
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
                    project: '111111111'
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const task = await response.json();
            console.log(task);

            // const card = createCard(task.id, task.title, task.description, task.status, task.due_date, task.assignee, task.priority);
            // const column = document.getElementById('todo-cards');
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
            console.log(board);
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