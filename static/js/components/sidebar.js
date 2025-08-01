export function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const expandBtn = document.getElementById('expand-collapse');
    const board = document.querySelector('.kanban-board');
    let isExpanded = localStorage.getItem('sidebarExpanded') !== 'false';

    function updateState() {
        sidebar.classList.toggle('collapsed', !isExpanded);
        sidebar.classList.toggle('expanded', isExpanded)
        board.classList.toggle('expand', !isExpanded);
        expandBtn.title = isExpanded ? 'Свернуть' : 'Развернуть';
    }

    expandBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        localStorage.setItem('sidebarExpanded', isExpanded);
        updateState();
    });

    ['project-btn', 'sidebar'].forEach(id => {
        const el = document.getElementById(id) || sidebar;
        el.addEventListener('mouseenter', () => !isExpanded && (sidebar.style.transform = 'translateX(0)'));
        el.addEventListener('mouseleave', () => !isExpanded && (sidebar.style.transform = 'translateX(-150%)'));
    });

    updateState();
}