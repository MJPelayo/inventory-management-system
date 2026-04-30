// Login Page JavaScript

// Auto-fill demo credentials
function fillCredentials(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('errorMessage');
            
            // Reset error
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            
            // Disable button during login
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            
            try {
                const result = await auth.login(email, password);
                
                if (result.success) {
                    // Redirect to appropriate dashboard
                    auth.redirectToDashboard();
                } else {
                    errorDiv.textContent = result.error || 'Invalid email or password';
                    errorDiv.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Sign in';
                }
            } catch (error) {
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Sign in';
            }
        });
    }
    
    // Check if already logged in
    if (auth.isLoggedIn()) {
        auth.redirectToDashboard();
    }
});