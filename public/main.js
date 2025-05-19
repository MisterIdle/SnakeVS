const socket = io()

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/header.html')
        .then(r => r.text())
        .then(html => {
            const header = document.getElementById('header');
            if (header) {
                header.innerHTML = html;    

                const token = localStorage.getItem('token');
                if (token) {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const username = payload.username;  

                    const loginLink = header.querySelector('a[href="/login.html"]');
                    if (loginLink) {
                        loginLink.textContent = username;
                        loginLink.removeAttribute('href');
                        loginLink.style.cursor = 'default';
                    }
                }
            }
        });


    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async e => {
            e.preventDefault();
            MisterIdle
        
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            const res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirmPassword })
            });

            if (res.ok) {
                e.target.reset();
                window.location.href = '/index.html';
            } else {
                const text = await res.text();
                alert('Error: ' + text);
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = document.getElementById('logEmail').value;
            const password = document.getElementById('logPassword').value;

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.token);
                e.target.reset();
                window.location.href = '/index.html';
            } else {
                const text = await res.text();
                alert('Error: ' + text);
            }
        });
    }

    if (location.pathname === '/' || location.pathname === '/index.html') {
        const token = localStorage.getItem('token');
        if (!token) window.location.href = '/login.html';
    }
});
