import { initSidebar } from '../components/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    // Тема
    const darkThemeLink = document.getElementById('dark-theme-link');
    const savedTheme = localStorage.getItem('theme');

    // Создаём переключатель динамически
    const toggleContainer = document.getElementById('theme-toggle-container');
    toggleContainer.innerHTML = `
        <label class="theme-toggle">
        <input type="checkbox" id="theme-toggle" ${savedTheme === 'dark' ? 'checked' : ''}>
        <span class="checkbox-ios-switch"></span>
        </label>
    `;

    const themeToggle = document.getElementById('theme-toggle');

    if (savedTheme === 'dark') {
        darkThemeLink.removeAttribute('disabled');
        body.classList.add('dark-theme');
        body.style.backgroundImage = 'url("/static/wallpapers/felix-mittermeier-WLGHjbC0Cq4-unsplash.jpg")';
        themeToggle.checked = true;
    } else {
        darkThemeLink.setAttribute('disabled', 'disabled');
        body.classList.remove('dark-theme')
        body.style.backgroundImage = 'url("/static/wallpapers/laura-adai-BB0eIqCHibk-unsplash.jpg")';
        themeToggle.checked = false;
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            darkThemeLink.removeAttribute('disabled');
            body.style.backgroundImage = 'url("/static/wallpapers/felix-mittermeier-WLGHjbC0Cq4-unsplash.jpg")';
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            darkThemeLink.setAttribute('disabled', 'disabled');
            body.style.backgroundImage = 'url("/static/wallpapers/laura-adai-BB0eIqCHibk-unsplash.jpg")';
            body.classList.remove('dark-theme')
            localStorage.setItem('theme', 'light');
        }
    });

    const notificationsBtn = document.getElementById('notifications-btn');
    const kanbanBtn = document.getElementById('project-btn');

    if (kanbanBtn) {
        kanbanBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            window.location.href = '/notifications';
        });
    }

    initSidebar();
});