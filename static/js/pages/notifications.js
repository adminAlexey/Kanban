import { initSidebar } from '../components/sidebar.js';

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    // Тема
    const kanbanBtn = document.getElementById('project-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const savedTheme = localStorage.getItem('theme');
    const darkThemeLink = document.getElementById('dark-theme-link');
    
    if (savedTheme === 'dark') {
        darkThemeLink.removeAttribute('disabled');
        body.classList.add('dark-theme');
        body.style.backgroundImage = 'url("/static/wallpapers/felix-mittermeier-WLGHjbC0Cq4-unsplash.jpg")';
    } else {
        darkThemeLink.setAttribute('disabled', 'disabled'); 
        body.classList.remove('dark-theme');
        body.style.backgroundImage = 'url("/static/wallpapers/laura-adai-BB0eIqCHibk-unsplash.jpg")';
    }

    if (kanbanBtn) {
        kanbanBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = '/settings';
        });
    }

    initSidebar();
});