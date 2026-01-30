
const API_URL = 'http://localhost:3000';



const state = {
    user: null,
    token: localStorage.getItem('token') || null,
    currentQuiz: null,
    quizAnswers: [],
    currentQuestionIndex: 0,
    quizzes: []
};


const pages = {
    home: document.getElementById('homePage'),
    browse: document.getElementById('browsePage'),
    create: document.getElementById('createPage'),
    myQuizzes: document.getElementById('myQuizzesPage'),
    take: document.getElementById('takePage'),
    results: document.getElementById('resultsPage')
};


document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
    loadQuizzes();
});


function initializeAuth() {
    if (state.token) {
        try {
            const payload = JSON.parse(atob(state.token.split('.')[1]));
            state.user = { username: payload.username, userId: payload.userId };
            updateAuthUI(true);
        } catch (error) {
            logout();
        }
    }
}

function updateAuthUI(isLoggedIn) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu = document.getElementById('userMenu');
    const createLink = document.getElementById('createLink');
    const myQuizzesLink = document.getElementById('myQuizzesLink');
    const userName = document.getElementById('userName');

    if (isLoggedIn) {
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        createLink.style.display = 'block';
        myQuizzesLink.style.display = 'block';
        userName.textContent = state.user.username;
    } else {
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        userMenu.style.display = 'none';
        createLink.style.display = 'none';
        myQuizzesLink.style.display = 'none';
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        updateAuthUI(true);
        closeModal();
        showNotification('Account created successfully!');
    } catch (error) {
        document.getElementById('signupError').textContent = error.message;
        document.getElementById('signupError').classList.add('active');
    }
}


async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        state.token = data.token;
        state.user = data.user;
        localStorage.setItem('token', data.token);
        updateAuthUI(true);
        closeModal();
        showNotification('Welcome back!');
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
        document.getElementById('loginError').classList.add('active');
    }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    updateAuthUI(false);
    navigateToPage('home');
    showNotification('Logged out successfully');
}


function navigateToPage(pageName) {
  
    Object.values(pages).forEach(page => {
        if (page) page.classList.remove('active');
    });

  
    if (pages[pageName]) {
        pages[pageName].classList.add('active');

       
        if (pageName === 'browse') {
            loadQuizzes();
        } else if (pageName === 'myQuizzes') {
            if (!state.user) {
                showAuthModal('login');
                navigateToPage('home');
                return;
            }
            loadMyQuizzes();
        } else if (pageName === 'create') {
            if (!state.user) {
                showAuthModal('login');
                navigateToPage('home');
                return;
            }
            resetCreateForm();
        }
    }

  
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


async function loadQuizzes() {
    const grid = document.getElementById('quizGrid');
    grid.innerHTML = '<div class="loading">Loading quizzes...</div>';

    try {
        const response = await fetch(`${API_URL}/api/quizzes`);
        const quizzes = await response.json();
        state.quizzes = quizzes;

        if (quizzes.length === 0) {
            grid.innerHTML = '<div class="loading">No quizzes available yet. Be the first to create one!</div>';
            return;
        }

        grid.innerHTML = quizzes.map(quiz => createQuizCard(quiz)).join('');
    } catch (error) {
        grid.innerHTML = '<div class="loading">Error loading quizzes. Please try again.</div>';
    }
}

async function loadMyQuizzes() {
    const grid = document.getElementById('myQuizzesGrid');
    grid.innerHTML = '<div class="loading">Loading your quizzes...</div>';

    try {
        const response = await fetch(`${API_URL}/api/quizzes/user/my-quizzes`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        const quizzes = await response.json();

        if (quizzes.length === 0) {
            grid.innerHTML = '<div class="loading">You haven\'t created any quizzes yet.</div>';
            return;
        }

        grid.innerHTML = quizzes.map(quiz => createQuizCard(quiz, true)).join('');
    } catch (error) {
        grid.innerHTML = '<div class="loading">Error loading your quizzes.</div>';
    }
}

function createQuizCard(quiz, isOwner = false) {
    return `
        <div class="quiz-card" onclick="openQuiz('${quiz._id}')">
            <div class="quiz-card-header">
                <div>
                    <h3 class="quiz-card-title">${quiz.title}</h3>
                    <div class="quiz-card-meta">
                        <span>By ${quiz.creatorName}</span>
                        <span>${new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <p class="quiz-card-description">${quiz.description || 'No description provided.'}</p>
            <div class="quiz-card-stats">
                <div class="quiz-stat">
                    <span class="quiz-stat-label">Questions</span>
                    <span class="quiz-stat-value">${quiz.questions.length}</span>
                </div>
                <div class="quiz-stat">
                    <span class="quiz-stat-label">Attempts</span>
                    <span class="quiz-stat-value">${quiz.attempts}</span>
                </div>
                ${quiz.attempts > 0 ? `
                <div class="quiz-stat">
                    <span class="quiz-stat-label">Avg Score</span>
                    <span class="quiz-stat-value">${quiz.averageScore.toFixed(1)}</span>
                </div>
                ` : ''}
            </div>
            ${isOwner ? `
            <div class="quiz-actions" onclick="event.stopPropagation()">
                <button class="btn btn-small btn-ghost" onclick="deleteQuiz('${quiz._id}')">Delete</button>
            </div>
            ` : ''}
        </div>
    `;
}

async function openQuiz(quizId) {
    if (!state.user) {
        showAuthModal('login');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/quizzes/${quizId}`);
        const quiz = await response.json();
        
        state.currentQuiz = quiz;
        state.quizAnswers = new Array(quiz.questions.length).fill(null);
        state.currentQuestionIndex = 0;

        displayQuiz();
        navigateToPage('take');
    } catch (error) {
        showNotification('Error loading quiz');
    }
}

function displayQuiz() {
    const quiz = state.currentQuiz;
    const header = document.getElementById('quizHeader');
    
    header.innerHTML = `
        <h1 class="quiz-card-title">${quiz.title}</h1>
        <p class="quiz-card-description">${quiz.description || ''}</p>
    `;

    displayQuestion();
}

function displayQuestion() {
    const quiz = state.currentQuiz;
    const index = state.currentQuestionIndex;
    const question = quiz.questions[index];

    document.getElementById('currentQuestion').textContent = index + 1;
    document.getElementById('totalQuestions').textContent = quiz.questions.length;

    const progress = ((index + 1) / quiz.questions.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    const container = document.getElementById('questionContainer');
    container.innerHTML = `
        <h2 class="question-text">${question.question}</h2>
        <div class="options-list">
            ${question.options.map((option, i) => `
                <button class="option-button ${state.quizAnswers[index] === i ? 'selected' : ''}" 
                        onclick="selectAnswer(${i})">
                    ${option}
                </button>
            `).join('')}
        </div>
    `;

  
    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').style.display = index === quiz.questions.length - 1 ? 'none' : 'block';
    document.getElementById('submitQuizBtn').style.display = index === quiz.questions.length - 1 ? 'block' : 'none';
}

function selectAnswer(optionIndex) {
    state.quizAnswers[state.currentQuestionIndex] = optionIndex;
    displayQuestion();
}

function previousQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        displayQuestion();
    }
}

function nextQuestion() {
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
        state.currentQuestionIndex++;
        displayQuestion();
    }
}

async function submitQuiz() {
  
    if (state.quizAnswers.includes(null)) {
        showNotification('Please answer all questions before submitting');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/quizzes/${state.currentQuiz._id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ answers: state.quizAnswers })
        });

        const result = await response.json();
        displayResults(result);
    } catch (error) {
        showNotification('Error submitting quiz');
    }
}

function displayResults(result) {
    const percentage = parseFloat(result.percentage);
    
    document.getElementById('scorePercentage').textContent = `${percentage.toFixed(0)}%`;
    document.getElementById('scoreLabel').textContent = `${result.score}/${result.totalQuestions}`;

   
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;
    document.getElementById('scoreRing').style.strokeDashoffset = offset;

   
    const detailsContainer = document.getElementById('resultsDetails');
    detailsContainer.innerHTML = `
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 1rem;">Question Breakdown</h3>
        ${result.results.map((item, index) => `
            <div class="result-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-question">Question ${index + 1}: ${item.question}</div>
                <div class="result-answer ${item.isCorrect ? 'correct' : 'incorrect'}">
                    Your answer: ${item.options[item.userAnswer]}
                </div>
                ${!item.isCorrect ? `
                    <div class="result-answer correct">
                        Correct answer: ${item.options[item.correctAnswer]}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    `;

  
    if (!document.getElementById('scoreGradient')) {
        const svg = document.querySelector('.score-ring');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#4ECDC4;stop-opacity:1" />
            </linearGradient>
        `;
        svg.appendChild(defs);
    }

    navigateToPage('results');
}


function resetCreateForm() {
    document.getElementById('createQuizForm').reset();
    document.getElementById('questionsContainer').innerHTML = '';
    addQuestion();
}

function addQuestion() {
    const container = document.getElementById('questionsContainer');
    const questionNumber = container.children.length + 1;

    const questionCard = document.createElement('div');
    questionCard.className = 'question-card';
    questionCard.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${questionNumber}</span>
            ${questionNumber > 1 ? '<button type="button" class="remove-question-btn" onclick="removeQuestion(this)">Remove</button>' : ''}
        </div>
        <div class="form-group">
            <label class="form-label">Question Text *</label>
            <input type="text" class="form-input question-text-input" required placeholder="Enter your question...">
        </div>
        <div class="form-group">
            <label class="form-label">Options *</label>
            <div class="options-container">
                ${[0, 1, 2, 3].map(i => `
                    <div class="option-group">
                        <input type="text" class="form-input option-input" required placeholder="Option ${i + 1}">
                        <label class="correct-checkbox">
                            <input type="radio" name="correct-${questionNumber}" value="${i}" ${i === 0 ? 'checked' : ''}>
                            <span>Correct</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    container.appendChild(questionCard);
}

function removeQuestion(button) {
    button.closest('.question-card').remove();
    updateQuestionNumbers();
}

function updateQuestionNumbers() {
    const questions = document.querySelectorAll('.question-card');
    questions.forEach((card, index) => {
        card.querySelector('.question-number').textContent = `Question ${index + 1}`;
        const radios = card.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            radio.name = `correct-${index + 1}`;
        });
    });
}

async function createQuiz(event) {
    event.preventDefault();

    const title = document.getElementById('quizTitle').value;
    const description = document.getElementById('quizDescription').value;
    const timeLimit = parseInt(document.getElementById('quizTimeLimit').value);

    const questionCards = document.querySelectorAll('.question-card');
    const questions = [];

    questionCards.forEach(card => {
        const questionText = card.querySelector('.question-text-input').value;
        const options = Array.from(card.querySelectorAll('.option-input')).map(input => input.value);
        const correctRadio = card.querySelector('input[type="radio"]:checked');
        const correctAnswer = parseInt(correctRadio.value);

        questions.push({
            question: questionText,
            options,
            correctAnswer
        });
    });

    try {
        const response = await fetch(`${API_URL}/api/quizzes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ title, description, questions, timeLimit })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        showNotification('Quiz created successfully!');
        navigateToPage('browse');
        loadQuizzes();
    } catch (error) {
        showNotification('Error creating quiz: ' + error.message);
    }
}

async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete quiz');
        }

        showNotification('Quiz deleted successfully');
        loadMyQuizzes();
    } catch (error) {
        showNotification('Error deleting quiz');
    }
}


function showAuthModal(form = 'login') {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    if (form === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    
    
    document.getElementById('loginError').classList.remove('active');
    document.getElementById('signupError').classList.remove('active');
}


function showNotification(message) {
   
    alert(message);
}


function setupEventListeners() {
  
    
    document.querySelectorAll('[data-page]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const page = element.getAttribute('data-page');
            navigateToPage(page);
        });
    });

   
    
    document.getElementById('mobileMenuToggle').addEventListener('click', () => {
        document.getElementById('navLinks').classList.toggle('active');
    });

   
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('signupBtn').addEventListener('click', () => showAuthModal('signup'));
    document.getElementById('heroCreateBtn').addEventListener('click', () => {
        if (!state.user) {
            showAuthModal('login');
        } else {
            navigateToPage('create');
        }
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);

  
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.querySelector('.modal-overlay').addEventListener('click', closeModal);
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal('signup');
    });
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
        e.preventDefault();
        showAuthModal('login');
    });

   
    document.getElementById('loginFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        login(email, password);
    });

    document.getElementById('signupFormElement').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        register(username, email, password);
    });

   
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestion);
    document.getElementById('createQuizForm').addEventListener('submit', createQuiz);

   
    document.getElementById('prevBtn').addEventListener('click', previousQuestion);
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);

  
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredQuizzes = state.quizzes.filter(quiz => 
            quiz.title.toLowerCase().includes(searchTerm) ||
            quiz.description.toLowerCase().includes(searchTerm)
        );
        
        const grid = document.getElementById('quizGrid');
        grid.innerHTML = filteredQuizzes.map(quiz => createQuizCard(quiz)).join('');
    });
}
