export function initModals() {
    const modals = [
        'modal-new-task',
        'modal-new-board',
        'modal-edit-task'
    ].map(id => document.getElementById(id)).filter(Boolean);

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.select-options').forEach(el => el.style.display = 'none');
        }
    });
}

export function initPriorityButtons() {
    const priorityButtons = document.querySelectorAll('.priority-btn');
    const priorityInput = document.getElementById('priority');

    priorityButtons.forEach(button => {
        button.addEventListener('click', () => {
            priorityButtons.forEach(btn => btn.style.border = 'none');
            button.style.border = '4px solid black';
            priorityInput.value = button.dataset.priority;
        });
    });
}