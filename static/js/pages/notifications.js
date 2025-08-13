localStorage.setItem('login', '22170424');
const login = localStorage.getItem('login');

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    const telegramLink = document.getElementById("telegram-link");
    telegramLink.href = `https://t.me/kanban_notice_flask_bot?start=${login}`;

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

    const telegramCheckbox = document.getElementById('telegram-enabled');
    const emailCheckbox = document.getElementById('email-enabled');

    // loadNotificationSettings(username);

    // telegramCheckbox.addEventListener('change', () => {
    //     saveNotificationSettings(username, {
    //         telegram: telegramCheckbox.checked,
    //         email: emailCheckbox.checked
    //     });
    // });

    // emailCheckbox.addEventListener('change', () => {
    //     saveNotificationSettings(username, {
    //         telegram: telegramCheckbox.checked,
    //         email: emailCheckbox.checked
    //     });
    // });

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
});