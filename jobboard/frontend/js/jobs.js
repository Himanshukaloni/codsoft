// API Base URL
const API_URL = 'http://localhost:5000/api';

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Get user from localStorage
function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

let allJobs = [];

// Fetch and display jobs
async function fetchJobs(searchQuery = '', location = '', jobType = '') {
  const jobsGrid = document.getElementById('jobsGrid');
  const loadingDiv = document.getElementById('loading');
  
  loadingDiv.classList.remove('hidden');
  jobsGrid.innerHTML = '';
  
  try {
    let url = `${API_URL}/jobs?`;
    if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
    if (location) url += `location=${encodeURIComponent(location)}&`;
    if (jobType) url += `jobType=${encodeURIComponent(jobType)}&`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    loadingDiv.classList.add('hidden');
    
    if (data.success && data.jobs.length > 0) {
      allJobs = data.jobs;
      displayJobs(data.jobs);
    } else {
      jobsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>No jobs found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    loadingDiv.classList.add('hidden');
    jobsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>Error loading jobs</h3>
        <p>Please check your connection and try again</p>
      </div>
    `;
  }
}

// Display jobs in grid
function displayJobs(jobs) {
  const jobsGrid = document.getElementById('jobsGrid');
  const user = getUser();
  
  jobsGrid.innerHTML = jobs.map(job => `
    <div class="card">
      <div class="card-header">
        ${job.companyLogo ? 
          `<img src="${API_URL.replace('/api', '')}${job.companyLogo}" alt="${job.companyName}" class="company-logo">` :
          `<div class="company-logo" style="display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0a66c2;">${job.companyName.charAt(0)}</div>`
        }
        <div>
          <h3 class="card-title">${job.title}</h3>
          <p class="card-subtitle">${job.companyName}</p>
        </div>
      </div>
      <div class="card-content">
        <p>${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}</p>
      </div>
      <div class="card-footer">
        <div class="card-tags">
          <span class="tag primary">${job.jobType}</span>
          <span class="tag">${job.location}</span>
          <span class="tag success">${job.salary}</span>
        </div>
        <button class="btn btn-primary" onclick="viewJobDetails('${job._id}')">View Details</button>
      </div>
    </div>
  `).join('');
}

// View job details in modal
async function viewJobDetails(jobId) {
  const modal = document.getElementById('jobModal');
  const modalContent = document.getElementById('jobModalContent');
  
  modal.classList.add('active');
  modalContent.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  
  try {
    const response = await fetch(`${API_URL}/jobs/${jobId}`);
    const data = await response.json();
    
    if (data.success) {
      const job = data.job;
      const user = getUser();
      const isStudent = user && user.role === 'student';
      
      modalContent.innerHTML = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <div class="card-header">
          ${job.companyLogo ? 
            `<img src="${API_URL.replace('/api', '')}${job.companyLogo}" alt="${job.companyName}" class="company-logo">` :
            `<div class="company-logo" style="display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #0a66c2;">${job.companyName.charAt(0)}</div>`
          }
          <div>
            <h2 class="card-title">${job.title}</h2>
            <p class="card-subtitle">${job.companyName}</p>
          </div>
        </div>
        
        <div style="margin: 20px 0;">
          <div class="card-tags">
            <span class="tag primary">${job.jobType}</span>
            <span class="tag">${job.location}</span>
            <span class="tag success">${job.salary}</span>
            ${job.experience ? `<span class="tag">${job.experience}</span>` : ''}
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin-bottom: 10px;">Job Description</h3>
          <p style="color: #666; line-height: 1.6;">${job.description}</p>
        </div>
        
        ${job.requirements ? `
          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Requirements</h3>
            <p style="color: #666; line-height: 1.6;">${job.requirements}</p>
          </div>
        ` : ''}
        
        ${job.positions ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Positions Available:</strong> ${job.positions}</p>
          </div>
        ` : ''}
        
        ${job.deadline ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Application Deadline:</strong> ${new Date(job.deadline).toLocaleDateString()}</p>
          </div>
        ` : ''}
        
        ${job.postedBy && job.postedBy.companyWebsite ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Company Website:</strong> <a href="${job.postedBy.companyWebsite}" target="_blank" style="color: #0a66c2;">${job.postedBy.companyWebsite}</a></p>
          </div>
        ` : ''}
        
        ${isStudent ? `
          <button class="btn btn-primary btn-block" onclick="applyForJob('${job._id}')">
            Apply Now
          </button>
        ` : !user ? `
          <a href="login.html" class="btn btn-primary btn-block">
            Login to Apply
          </a>
        ` : ''}
      `;
    }
  } catch (error) {
    console.error('Error fetching job details:', error);
    modalContent.innerHTML = `
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <div class="empty-state">
        <h3>Error loading job details</h3>
        <p>Please try again</p>
      </div>
    `;
  }
}

// Apply for job
async function applyForJob(jobId) {
  const token = getToken();
  
  if (!token) {
    alert('Please login to apply for jobs');
    window.location.href = 'login.html';
    return;
  }
  
  if (!confirm('Are you sure you want to apply for this job?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ jobId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Application submitted successfully!');
      closeModal();
    } else {
      alert(data.message || 'Failed to submit application');
    }
  } catch (error) {
    console.error('Error applying for job:', error);
    alert('Network error. Please try again.');
  }
}

// Close modal
function closeModal() {
  const modal = document.getElementById('jobModal');
  modal.classList.remove('active');
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Load all jobs initially
  fetchJobs();
  
  // Search functionality
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const locationInput = document.getElementById('locationInput');
  const jobTypeFilter = document.getElementById('jobTypeFilter');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchQuery = searchInput.value.trim();
      const location = locationInput.value.trim();
      const jobType = jobTypeFilter.value;
      fetchJobs(searchQuery, location, jobType);
    });
  }
  
  // Enter key to search
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }
  
  // Filter changes
  if (jobTypeFilter) {
    jobTypeFilter.addEventListener('change', () => {
      const searchQuery = searchInput.value.trim();
      const location = locationInput.value.trim();
      const jobType = jobTypeFilter.value;
      fetchJobs(searchQuery, location, jobType);
    });
  }
  
  // Close modal on outside click
  window.onclick = function(event) {
    const modal = document.getElementById('jobModal');
    if (event.target === modal) {
      closeModal();
    }
  };
});
