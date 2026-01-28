// API Base URL
const API_URL = 'http://localhost:5000/api';

// Get token and user
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Protect page - only students
if (!protectPage('student')) {
  // Page will redirect in auth.js
}

let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
  await loadApplications();
  
  // Setup form handlers
  setupProfileForm();
  setupFileUploads();
});

// Load user profile
async function loadUserProfile() {
  const token = getToken();
  
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      displayUserProfile(currentUser);
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('Error loading profile', 'error');
  }
}

// Display user profile
function displayUserProfile(user) {
  // Profile photo
  const profilePhotoImg = document.getElementById('profilePhotoImg');
  if (profilePhotoImg) {
    if (user.profilePhoto) {
      profilePhotoImg.src = `${API_URL.replace('/api', '')}${user.profilePhoto}`;
    } else {
      profilePhotoImg.src = 'https://via.placeholder.com/150?text=' + user.name.charAt(0);
    }
  }
  
  // Welcome message
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) {
    welcomeName.textContent = user.name;
  }
  
  // Fill form fields
  document.getElementById('name').value = user.name || '';
  document.getElementById('email').value = user.email || '';
  document.getElementById('phone').value = user.phone || '';
  document.getElementById('bio').value = user.bio || '';
  document.getElementById('skills').value = user.skills || '';
  
  // Display current resume
  if (user.resume) {
    const resumeStatus = document.getElementById('resumeStatus');
    if (resumeStatus) {
      resumeStatus.innerHTML = `
        <span style="color: #057642;">✓ Resume uploaded</span>
        <a href="${API_URL.replace('/api', '')}${user.resume}" target="_blank" class="btn btn-outline" style="margin-left: 10px; padding: 5px 15px;">View Resume</a>
      `;
    }
  }
}

// Setup profile form
function setupProfileForm() {
  const profileForm = document.getElementById('profileForm');
  
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';
      
      const formData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        bio: document.getElementById('bio').value.trim(),
        skills: document.getElementById('skills').value.trim()
      };
      
      const token = getToken();
      
      try {
        const response = await fetch(`${API_URL}/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update localStorage
          const user = getUser();
          const updatedUser = { ...user, ...formData };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          showAlert('Profile updated successfully!', 'success');
          currentUser = data.user;
        } else {
          showAlert(data.message || 'Failed to update profile', 'error');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Network error. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}

// Setup file uploads
function setupFileUploads() {
  // Profile photo upload
  const profilePhotoInput = document.getElementById('profilePhotoInput');
  if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file', 'error');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert('Image must be less than 5MB', 'error');
        return;
      }
      
      await uploadFile(file, 'profilePhoto');
    });
  }
  
  // Resume upload
  const resumeInput = document.getElementById('resumeInput');
  if (resumeInput) {
    resumeInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        showAlert('Please select a PDF file', 'error');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showAlert('Resume must be less than 10MB', 'error');
        return;
      }
      
      await uploadFile(file, 'resume');
    });
  }
}

// Upload file
async function uploadFile(file, type) {
  const token = getToken();
  const formData = new FormData();
  
  let endpoint = '';
  let fieldName = '';
  
  if (type === 'profilePhoto') {
    endpoint = `${API_URL}/auth/upload-profile-photo`;
    fieldName = 'profilePhoto';
  } else if (type === 'resume') {
    endpoint = `${API_URL}/auth/upload-resume`;
    fieldName = 'resume';
  }
  
  formData.append(fieldName, file);
  
  try {
    showAlert(`Uploading ${type === 'profilePhoto' ? 'photo' : 'resume'}...`, 'info');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(`${type === 'profilePhoto' ? 'Photo' : 'Resume'} uploaded successfully!`, 'success');
      
      // Update display
      if (type === 'profilePhoto') {
        document.getElementById('profilePhotoImg').src = `${API_URL.replace('/api', '')}${data.photoPath}`;
      } else if (type === 'resume') {
        const resumeStatus = document.getElementById('resumeStatus');
        if (resumeStatus) {
          resumeStatus.innerHTML = `
            <span style="color: #057642;">✓ Resume uploaded</span>
            <a href="${API_URL.replace('/api', '')}${data.resumePath}" target="_blank" class="btn btn-outline" style="margin-left: 10px; padding: 5px 15px;">View Resume</a>
          `;
        }
      }
      
      // Reload profile
      await loadUserProfile();
    } else {
      showAlert(data.message || 'Upload failed', 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showAlert('Network error. Please try again.', 'error');
  }
}

// Load applications
async function loadApplications() {
  const token = getToken();
  const applicationsContainer = document.getElementById('applicationsContainer');
  
  if (!applicationsContainer) return;
  
  applicationsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading applications...</p></div>';
  
  try {
    const response = await fetch(`${API_URL}/applications/student/my-applications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.applications.length > 0) {
      displayApplications(data.applications);
    } else {
      applicationsContainer.innerHTML = `
        <div class="empty-state">
          <h3>No applications yet</h3>
          <p>Start applying for jobs to see them here</p>
          <a href="jobs.html" class="btn btn-primary">Browse Jobs</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading applications:', error);
    applicationsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error loading applications</h3>
        <p>Please try again</p>
      </div>
    `;
  }
}

// Display applications
function displayApplications(applications) {
  const applicationsContainer = document.getElementById('applicationsContainer');
  
  applicationsContainer.innerHTML = applications.map(app => `
    <div class="card">
      <div class="card-header">
        <div>
          <h3 class="card-title">${app.job.title}</h3>
          <p class="card-subtitle">${app.job.companyName}</p>
        </div>
      </div>
      <div class="card-content">
        <p style="margin-bottom: 10px;"><strong>Location:</strong> ${app.job.location}</p>
        <p style="margin-bottom: 10px;"><strong>Salary:</strong> ${app.job.salary}</p>
        <p style="margin-bottom: 10px;"><strong>Type:</strong> ${app.job.jobType}</p>
        <p style="margin-bottom: 10px;"><strong>Applied on:</strong> ${new Date(app.createdAt).toLocaleDateString()}</p>
      </div>
      <div class="card-footer">
        <span class="tag ${
          app.status === 'accepted' ? 'success' : 
          app.status === 'rejected' ? 'danger' : 
          'warning'
        }">${app.status.toUpperCase()}</span>
        ${app.status === 'pending' ? 
          `<button class="btn btn-danger" onclick="withdrawApplication('${app._id}')">Withdraw</button>` : 
          ''
        }
      </div>
    </div>
  `).join('');
}

// Withdraw application
async function withdrawApplication(applicationId) {
  if (!confirm('Are you sure you want to withdraw this application?')) {
    return;
  }
  
  const token = getToken();
  
  try {
    const response = await fetch(`${API_URL}/applications/${applicationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert('Application withdrawn successfully', 'success');
      loadApplications(); // Reload applications
    } else {
      showAlert(data.message || 'Failed to withdraw application', 'error');
    }
  } catch (error) {
    console.error('Error withdrawing application:', error);
    showAlert('Network error. Please try again.', 'error');
  }
}

// Show alert
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'info' ? 'info' : 'error'}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.dashboard-content');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 4000);
  }
}

// Switch sections
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Show selected section
  const section = document.getElementById(sectionName + 'Section');
  if (section) {
    section.classList.remove('hidden');
  }
  
  // Update sidebar active state
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');
}
