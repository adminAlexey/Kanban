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