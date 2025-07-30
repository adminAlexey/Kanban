import { apiGet, apiPost, apiDelete } from '../utils/api.js';
import { UserStorage, BoardStorage, ColumnSortStorage } from '../utils/storage.js';
import { initDragAndDrop } from '../components/drag-drop.js';
import { initPriorityButtons } from '../components/priority.js';
import { initCustomSelect, loadUsersForTaskForm } from '../components/custom-select.js';

let actualBoardId = BoardStorage.getActual();
let lastBoardId = BoardStorage.getLast();

const selectCreateButton = document.getElementById('select-create');
const modalEditTask = document.getElementById('modal-edit-task');
const modalNewTask = document.getElementById('modal-new-task');
const modalNewColumn = document.getElementById('modal-new-column');
const modalNewBoard = document.getElementById('modal-new-board');

// Глобальные переменные для отслеживания изменений
let globalTitle = '';
let globalDescription = '';
let globalAssignee = '';

export async function initBoard() {
    const savedUser = UserStorage.get();

    await updateBoardList(savedUser);
    initAddTaskForm();
    initAddBoardForm();
    initPriorityButtons();
    initCustomSelect();

    if (actualBoardId) {
        await updateBoardTask(actualBoardId);
    }
}

document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('click', function () {
        const text = option.textContent.trim();

        if (text === 'Задачу') {
            if (modalNewTask) {
                modalNewTask.style.display = 'flex';
                loadUsersForTaskForm(
                    modalNewTask.querySelector('.custom-select'),
                    modalNewTask.querySelector('#select-assignee'),
                    'Исполнитель'
                );
            }
        } else if (text === 'Колонку') {
            if (modalNewColumn) {
                modalNewColumn.style.display = 'flex';
            }
        } else if (text === 'Доску') {
            if (modalNewBoard) {
                modalNewBoard.style.display = 'flex';
            }
        }

        // Скрываем выпадающий список
        document.querySelector('.select-options').style.display = 'none';
    });
});

// Функция для обновления задачи в базе данных
export async function updateTaskInDB(id, columnID, title, description, dueDate, assignee, priority) {
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
async function checkUpdateTask(modalEditTask) {
    const currentTaskId = modalEditTask.dataset.cardID;
    const currentTitle = modalEditTask.querySelector('.card-title').textContent;
    const currentDescription = modalEditTask.querySelector('.card-description').innerText;
    const currentAssignee = modalEditTask.querySelector('#selected-assignee').textContent;

    const isChanged =
        globalTitle !== currentTitle ||
        globalDescription !== currentDescription ||
        globalAssignee !== currentAssignee;

    if (isChanged) {
        await updateTaskInDB(currentTaskId, null, currentTitle, currentDescription, null, currentAssignee, null);
        updateTaskOnBoard(currentTaskId, currentTitle, currentDescription, currentAssignee);
    }
}

function updateTaskOnBoard(id, currentTitle, currentDescription, currentAssignee) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (!card) return;

    const title = card.querySelector('.card-title');
    const description = card.querySelector('.card-description');
    const assignee = card.querySelector('.card-assignee');

    if (title) title.textContent = currentTitle;
    if (description) description.textContent = currentDescription;
    if (assignee) assignee.textContent = `Исполнитель: ${currentAssignee}`;
}

if (modalEditTask) {
    window.addEventListener('click', (event) => {
        if (event.target === modalEditTask) {
            checkUpdateTask(modalEditTask);
            modalEditTask.style.display = 'none';
        }
    });
}

async function updateBoardList(username) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    const boards = await apiPost('/api/boards', { username });

    boards.forEach(board => {
        const listItem = document.createElement('li');
        listItem.classList.add('board-item');
        listItem.textContent = board.name;
        listItem.dataset.boardId = board.id;
        listItem.dataset.boardOwnerId = board.owner_id;

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-board-btn');
        deleteBtn.innerHTML = 'X';
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await apiDelete(`/api/board/${board.id}`);
                await updateBoardList(username);
                if (actualBoardId !== lastBoardId) {
                    await updateBoardTask(lastBoardId);
                }
            } catch (error) {
                console.error('Error deleting board:', error);
            }
        });

        listItem.appendChild(deleteBtn);
        listItem.addEventListener('click', async () => {
            if (actualBoardId !== board.id) {
                lastBoardId = actualBoardId;
                BoardStorage.setLast(lastBoardId);
            }
            actualBoardId = board.id;
            BoardStorage.setActual(actualBoardId);
            await updateBoardTask(actualBoardId);
        });

        projectList.appendChild(listItem);
    });
}

async function updateBoardTask(board_id) {
    const board_info = await apiGet(`/api/board/${board_id}`);
    if (!board_info) return;

    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';

    board_info.forEach(column => {
        const columnElement = createColumn(column, board_id);
        columnList.appendChild(columnElement);
    });

    const addColumn = createButtonAddColumn();
    columnList.appendChild(addColumn);

    initDragAndDrop(updateColumnCounters, updateTaskInDB);
}

function createColumn(column, board_id) {
    const outerColumn = document.createElement('div');
    outerColumn.classList.add('column');

    const columnDiv = document.createElement('div');
    const cleanTitle = column.title.replace(/\s+/g, '-').toLowerCase();
    columnDiv.classList.add(`${cleanTitle}-column`, 'cards');
    columnDiv.dataset.columnId = column.id;
    columnDiv.dataset.columnTitle = column.title;

    const header = createColumnHeader(column, columnDiv, board_id);
    outerColumn.appendChild(header);
    outerColumn.appendChild(columnDiv);

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

    // const sortButton = document.createElement('button');
    const sortButton = document.createElement('div');
    
    const img = document.createElement('img');
    img.src = '/static/icons/filter24.png'; // путь к вашей иконке
    img.alt = 'Сортировать';
    img.style.width = "24px";
    img.style.height = "24px";
    sortButton.appendChild(img);

    sortButton.className = 'sort-btn';
    sortButton.classList.add('icon');
    sortButton.dataset.columnId = column.id;
    sortButton.dataset.boardId = board_id;

    const sortKey = `${board_id}-${column.id}`;
    const saved = ColumnSortStorage.get()[sortKey] || { sortBy: 'default', order: 'asc' };
    sortButton.dataset.sortBy = saved.sortBy;
    sortButton.dataset.order = saved.order;
    updateSortButtonUI(sortButton);

    sortButton.addEventListener('click', () => {
        const current = { sortBy: sortButton.dataset.sortBy, order: sortButton.dataset.order };
        const next = getNextSortState(current);
        sortButton.dataset.sortBy = next.sortBy;
        sortButton.dataset.order = next.order;
        updateSortButtonUI(sortButton);

        const state = ColumnSortStorage.get();
        state[sortKey] = { sortBy: next.sortBy, order: next.order };
        ColumnSortStorage.set(state);

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
    const saved = ColumnSortStorage.get()[sortKey] || { sortBy: 'default', order: 'asc' };
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
        return isAsc ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });
}

function sortColumnTasks(columnElement, sortBy, order) {
    if (sortBy === 'default') return;
    const cards = Array.from(columnElement.querySelectorAll('.card'));
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
        return isAsc ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
    });

    cards.forEach(card => columnElement.appendChild(card));
}

function updateSortButtonUI(button) {
    const sortBy = button.dataset.sortBy;
    const order = button.dataset.order;
    // let symbol = '⇅';
    // if (sortBy === 'title') symbol = order === 'asc' ? 'A↑' : 'A↓';
    // else if (sortBy === 'due_date') symbol = order === 'asc' ? 'Date↑' : 'Date↓';
    // else if (sortBy === 'priority') symbol = order === 'asc' ? '!↑' : '!↓';
    // button.textContent = symbol;
}

async function addColumn() {
    try {
        await apiPost('/api/column', {
            board_id: actualBoardId,
            title: 'New Column'
        });
    } catch (error) {
        console.error('Error adding column:', error);
    }
}

function createButtonAddColumn() {
    const outer = document.createElement('div');
    outer.classList.add('column');

    const columnDiv = document.createElement('div');
    columnDiv.classList.add('column-add-column', 'column');
    columnDiv.style.width = '5vw';
    columnDiv.dataset.columnId = 0;

    const button = document.createElement('div');
    button.className = 'add-column-btn';
    button.innerHTML = '+';
    button.addEventListener('click', addColumn);
    columnDiv.appendChild(button);

    const header = document.createElement('div');
    header.classList.add('column-header');
    const title = document.createElement('h3');
    title.textContent = '+';
    header.appendChild(title);

    outer.appendChild(header);
    outer.appendChild(columnDiv);
    return outer;
}

async function createCard(id, title, description, dueDate, assignee, priority, columnTitle) {
    priority = parseInt(priority);
    const card = document.createElement('div');
    card.classList.add('card');
    card.draggable = true;
    card.dataset.id = id;
    card.dataset.priority = priority;

    let borderColor;
    if (priority === 1) borderColor = '#00ff00';
    else if (priority === 2) borderColor = '#fff700';
    else borderColor = '#ff0000';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    const priorityIndicator = document.createElement('div');
    priorityIndicator.className = 'priority-indicator';
    priorityIndicator.style.backgroundColor = borderColor;

    const titleElement = document.createElement('h3');
    titleElement.className = 'card-title';
    titleElement.textContent = title;

    cardHeader.appendChild(priorityIndicator);
    cardHeader.appendChild(titleElement);

    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'card-description';
    descriptionElement.textContent = description || 'No description';

    const dueDateElement = document.createElement('div');
    dueDateElement.className = 'card-due-date';
    dueDateElement.textContent = `До: ${dueDate}`;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const taskDueDate = new Date(dueDate);
    if (taskDueDate < today && columnTitle !== 'Done') {
        dueDateElement.classList.add('overdue');
    }

    const assigneeElement = document.createElement('div');
    assigneeElement.className = 'card-assignee';
    assigneeElement.textContent = `Исполнитель: ${assignee}`;

    card.appendChild(cardHeader);
    card.appendChild(descriptionElement);
    card.appendChild(assigneeElement);
    card.appendChild(dueDateElement);
    card.style.borderLeft = `2px solid ${borderColor}`;

    card.addEventListener('click', (e) => {
        if (!document.querySelector('.dragging')) {
            showCardInfo(id, title, description, dueDate, assignee, priority, columnTitle);
        }
    });

    return card;
}

function showCardInfo(id, title, description, dueDate, assignee, priority, columnTitle) {
    const modal = document.getElementById('modal-edit-task');
    modal.dataset.cardID = id;
    modal.style.display = 'flex';

    modal.querySelector('.card-title').textContent = title;
    modal.querySelector('.card-description').innerText = description;
    modal.querySelector('.card-due-date').textContent = `Выполнить до: ${dueDate}`;

    loadUsersForTaskForm(
        modal.querySelector('.custom-select'),
        modal.querySelector('#selected-assignee'),
        assignee
    );

    window.globalTitle = title;
    window.globalDescription = description;
    window.globalAssignee = assignee;
}

function updateColumnCounters() {
    document.querySelectorAll('.column').forEach(col => {
        const cardsContainer = col.querySelector('.cards');
        const counter = col.querySelector('.header-with-counter h5');
        if (counter && cardsContainer) {
            counter.textContent = cardsContainer.querySelectorAll('.card').length;
        }
    });
}

function initAddTaskForm() {
    const form = document.getElementById('task-form');
    const modal = document.getElementById('modal-new-task');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = form.querySelector('#title-task').value;
        const description = form.querySelector('#description').value;
        const dueDate = form.querySelector('#due-date').value;
        const assignee = form.querySelector('.select-button').innerHTML;
        const priority = form.querySelector('#priority').value;

        try {
            const task = await apiPost('/api/task', {
                owner: UserStorage.get(),
                assignee,
                title,
                description,
                due_date: dueDate,
                priority,
                project_id: actualBoardId
            });

            const column = document.querySelector('.backlog-column');
            const card = await createCard(task.id, task.title, task.description, dueDate, task.assignee, task.priority, column.dataset.columnTitle);
            column.appendChild(card);

            modal.style.display = 'none';
            form.reset();
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });
}

function initAddBoardForm() {
    const form = document.getElementById('board-form');
    const modal = document.getElementById('modal-new-board');
    const btn = document.getElementById('add-board-btn');
    if (!form || !btn) return;

    btn.addEventListener('click', () => modal.style.display = 'flex');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = form.querySelector('#title-board').value;
        try {
            await apiPost('/api/board', {
                owner: UserStorage.get(),
                board_name: title
            });
            modal.style.display = 'none';
            form.reset();
            await updateBoardList(UserStorage.get());
        } catch (error) {
            console.error('Error adding board:', error);
        }
    });
}