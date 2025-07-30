import { initSidebar } from './components/sidebar.js';
import { initModals } from './components/modal.js';
import { initPriorityButtons } from './components/priority.js';
import { initBoard } from './pages/board.js';

const body = document.body;

// Тема
const darkThemeLink = document.getElementById('dark-theme-link');
const settingsBtn = document.getElementById('settings-btn');
const notificationsBtn = document.getElementById('notifications-btn');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    darkThemeLink.removeAttribute('disabled');
    body.classList.add('dark-theme');
    body.style.backgroundImage = 'url("/static/wallpapers/felix-mittermeier-WLGHjbC0Cq4-unsplash.jpg")';
} else {
    darkThemeLink.setAttribute('disabled', 'disabled'); 
    body.classList.remove('dark-theme');
    body.style.backgroundImage = 'url("/static/wallpapers/laura-adai-BB0eIqCHibk-unsplash.jpg")';
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {


    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            window.location.href = '/notifications';
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = '/settings';
        });
    }

    initSidebar();
    initModals();
    initPriorityButtons();
    initBoard();
});