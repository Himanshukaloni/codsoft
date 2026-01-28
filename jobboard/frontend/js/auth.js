const API_URL = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function saveAuthData(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function isAuthenticated() {
  return !!getToken();
}

function redirectToDashboard() {
  const user = getUser();
  if (user) {
    if (user.role === 'student') {
      window.location.href = 'student-dashboard.html';
    } else if (user.role === 'recruiter') {
      window.location.href = 'recruiter-dashboard.html';
    }
  }
}

function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.form-container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 4000);
  }
}

if (document.getElementById('registerForm')) {
  if (isAuthenticated()) {
    redirectToDashboard();
  }

  const registerForm = document.getElementById('registerForm');
  
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    const formData = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    };
    
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      showAlert('Please fill in all fields', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    
    if (formData.password.length < 6) {
      showAlert('Password must be at least 6 characters', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveAuthData(data.token, data.user);
        showAlert('Registration successful! Redirecting...', 'success');
        setTimeout(() => redirectToDashboard(), 1500);
      } else {
        showAlert(data.message || 'Registration failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Registration error:', error);
      showAlert('Network error. Please check your connection.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

if (document.getElementById('loginForm')) {
  // Redirect if already logged in
  if (isAuthenticated()) {
    redirectToDashboard();
  }

  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing In...';
    
    const formData = {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };
    
    if (!formData.email || !formData.password) {
      showAlert('Please fill in all fields', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveAuthData(data.token, data.user);
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => redirectToDashboard(), 1500);
      } else {
        showAlert(data.message || 'Login failed', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Network error. Please check your connection.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}


function logout() {
  clearAuthData();
  window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtns = document.querySelectorAll('.logout-btn, #logoutBtn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    });
  });
});

function protectPage(allowedRole = null) {
  const user = getUser();
  
  if (!isAuthenticated() || !user) {
    window.location.href = 'login.html';
    return false;
  }
  
  if (allowedRole && user.role !== allowedRole) {
    alert('Access denied. You do not have permission to view this page.');
    redirectToDashboard();
    return false;
  }
  
  return true;
}

function updateNavbar() {
  const user = getUser();
  const authLinks = document.getElementById('authLinks');
  
  if (authLinks) {
    if (isAuthenticated() && user) {
      authLinks.innerHTML = `
        <li><a href="jobs.html">Jobs</a></li>
        <li><a href="${user.role === 'student' ? 'student-dashboard.html' : 'recruiter-dashboard.html'}">Dashboard</a></li>
        <li><a href="#" class="navbar-btn logout-btn" id="logoutBtn">Logout</a></li>
      `;
      
     
      document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          logout();
        }
      });
    } else {
      authLinks.innerHTML = `
        <li><a href="jobs.html">Jobs</a></li>
        <li><a href="login.html">Login</a></li>
        <li><a href="register.html" class="navbar-btn">Register</a></li>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
