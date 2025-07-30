import { apiGet } from '../utils/api.js';

export async function initCustomSelect() {
    document.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', function () {
            const options = this.closest('.custom-select')?.querySelector('.select-options');
            if (options) {
                options.style.display = options.style.display === 'block' ? 'none' : 'block';
            }
        });
    });
}

export async function loadUsersForTaskForm(customSelect, selectButton, selectButtonText) {
    if (!customSelect || !selectButton) return;

    selectButton.textContent = selectButtonText;
    const selectOptions = customSelect.querySelector('.select-options');
    if (!selectOptions) return;

    // Очищаем предыдущие опции
    selectOptions.innerHTML = '';

    try {
        const actualBoardId = localStorage.getItem('actualBoardId');
        if (!actualBoardId) return;

        const data = await apiGet(`/api/users/${actualBoardId}`);
        const users = data.users || [];

        users.forEach(user => {
            const option = document.createElement('div');
            option.className = 'option';
            option.innerHTML = user.username;
            option.dataset.userId = user.id;
            option.addEventListener('click', function () {
                selectButton.textContent = option.textContent;
                selectOptions.style.display = 'none';
            });
            selectOptions.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        const option = document.createElement('div');
        option.className = 'option';
        option.textContent = 'Ошибка загрузки';
        option.style.color = 'red';
        selectOptions.appendChild(option);
    }
}