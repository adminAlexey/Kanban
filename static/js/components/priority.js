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