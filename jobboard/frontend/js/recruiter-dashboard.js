// ================= API =================
const API_URL = 'http://localhost:5000/api';

// ================= AUTH HELPERS =================
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Protect recruiter page
if (typeof protectPage === 'function') {
  protectPage('recruiter');
}

let currentUser = null;
let allJobs = [];

// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  loadMyJobs();
  setupProfileForm();
  setupLogoUpload();
  setupJobForm();
});

// ================= LOAD PROFILE =================
async function loadUserProfile() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      fillProfile(data.user);
    }
  } catch (err) {
    console.error(err);
    showAlert('Failed to load profile', 'error');
  }
}

// ================= FILL PROFILE =================
function fillProfile(user) {
  document.getElementById('name').value = user.name || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('companyName').value = user.companyName || '';
  document.getElementById('companyDescription').value = user.companyDescription || '';
  document.getElementById('companyWebsite').value = user.companyWebsite || '';

  const logo = document.getElementById('companyLogoImg');
  if (logo) {
    logo.src = user.companyLogo
      ? `http://localhost:5000${user.companyLogo}`
      : 'https://via.placeholder.com/150?text=Logo';
  }

  const welcome = document.getElementById('welcomeName');
  if (welcome) welcome.textContent = user.name;
}

// ================= UPDATE PROFILE =================
function setupProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById('name').value.trim(),
      companyName: document.getElementById('companyName').value.trim(),
      companyDescription: document.getElementById('companyDescription').value.trim()
    };

    try {
      const res = await fetch(`${API_URL}/auth/profile/recruiter`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        showAlert('Profile updated successfully');
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Profile update failed', 'error');
    }
  });
}

// ================= LOGO UPLOAD =================
function setupLogoUpload() {
  const input = document.getElementById('logoInput');
  if (!input) return;

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('companyLogo', file);

    try {
      const res = await fetch(`${API_URL}/auth/profile/recruiter`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        document.getElementById('companyLogoImg').src =
          `http://localhost:5000${data.user.companyLogo}`;
        showAlert('Logo uploaded successfully');
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Logo upload failed', 'error');
    }
  });
}

// ================= POST JOB =================
function setupJobForm() {
  const form = document.getElementById('jobForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      title: jobTitle.value.trim(),
      description: jobDescription.value.trim(),
      requirements: jobRequirements.value.trim(),
      location: jobLocation.value.trim(),
      salary: jobSalary.value.trim(),
      jobType: jobType.value
    };

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        showAlert('Job posted successfully');
        form.reset();
        loadMyJobs();
        showSection('jobs');
      } else {
        showAlert(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Job posting failed', 'error');
    }
  });
}

// ================= LOAD JOBS =================
async function loadMyJobs() {
  const container = document.getElementById('jobsContainer');
  if (!container) return;

  container.innerHTML = 'Loading...';

  try {
    const res = await fetch(`${API_URL}/jobs/recruiter/my-jobs`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (data.success && data.jobs.length) {
      allJobs = data.jobs;
      renderJobs(data.jobs);
    } else {
      container.innerHTML = '<p>No jobs posted yet</p>';
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>Error loading jobs</p>';
  }
}

// ================= RENDER JOBS =================
function renderJobs(jobs) {
  const container = document.getElementById('jobsContainer');

  container.innerHTML = jobs.map(job => `
    <div class="card">
      <h3>${job.title}</h3>
      <p>${job.location} | ${job.salary}</p>
      <button onclick="viewApplicants('${job._id}')">Applicants</button>
      <button onclick="deleteJob('${job._id}')">Delete</button>
    </div>
  `).join('');
}

// ================= DELETE JOB =================
async function deleteJob(id) {
  if (!confirm('Delete this job?')) return;

  try {
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    const data = await res.json();
    if (data.success) {
      showAlert('Job deleted');
      loadMyJobs();
    }
  } catch (err) {
    console.error(err);
  }
}

// ================= UI HELPERS =================
function viewApplicants(id) {
  window.location.href = `applicants.html?jobId=${id}`;
}

function showSection(name) {
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(`${name}Section`);
  if (el) el.classList.remove('hidden');
}

function showAlert(msg, type = 'success') {
  const div = document.createElement('div');
  div.className = `alert ${type}`;
  div.innerText = msg;
  document.body.prepend(div);
  setTimeout(() => div.remove(), 3000);
}
