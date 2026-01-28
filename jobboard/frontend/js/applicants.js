
const API_URL = 'http://localhost:5000/api';


function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

if (!protectPage('recruiter')) {
 
}

let currentJob = null;
let applications = [];


document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('jobId');
  
  if (jobId) {
    await loadJob(jobId);
    await loadApplicants(jobId);
  } else {
    document.getElementById('applicantsContainer').innerHTML = `
      <div class="empty-state">
        <h3>No job selected</h3>
        <p>Please select a job from your dashboard</p>
        <a href="recruiter-dashboard.html" class="btn btn-primary">Go to Dashboard</a>
      </div>
    `;
  }
});

async function loadJob(jobId) {
  const token = getToken();
  
  try {
    const response = await fetch(`${API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentJob = data.job;
      displayJobHeader(currentJob);
    }
  } catch (error) {
    console.error('Error loading job:', error);
  }
}

function displayJobHeader(job) {
  const jobInfo = document.getElementById('jobInfo');
  if (jobInfo) {
    jobInfo.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">${job.title}</h2>
            <p class="card-subtitle">${job.companyName} • ${job.location}</p>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-tags">
            <span class="tag primary">${job.jobType}</span>
            <span class="tag success">${job.salary}</span>
            <span class="tag">${applications.length} Applicants</span>
          </div>
          <a href="recruiter-dashboard.html" class="btn btn-outline">Back to Dashboard</a>
        </div>
      </div>
    `;
  }
}
async function loadApplicants(jobId) {
  const token = getToken();
  const applicantsContainer = document.getElementById('applicantsContainer');
  
  applicantsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading applicants...</p></div>';
  
  try {
    const response = await fetch(`${API_URL}/applications/job/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.applications.length > 0) {
      applications = data.applications;
      displayJobHeader(currentJob); 
      displayApplicants(data.applications);
    } else {
      applicantsContainer.innerHTML = `
        <div class="empty-state">
          <h3>No applicants yet</h3>
          <p>When candidates apply for this position, they will appear here</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading applicants:', error);
    applicantsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error loading applicants</h3>
        <p>Please try again</p>
      </div>
    `;
  }
}

function displayApplicants(applications) {
  const applicantsContainer = document.getElementById('applicantsContainer');
  
  applicantsContainer.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Skills</th>
            <th>Applied Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${applications.map(app => `
            <tr>
              <td>
                <div class="applicant-info">
                  ${app.applicant.profilePhoto ? 
                    `<img src="${API_URL.replace('/api', '')}${app.applicant.profilePhoto}" alt="${app.applicant.name}" class="applicant-photo">` :
                    `<div class="applicant-photo" style="background: #0a66c2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${app.applicant.name.charAt(0)}</div>`
                  }
                  <div>
                    <strong>${app.applicant.name}</strong>
                    ${app.applicant.resume ? 
                      `<br><a href="${API_URL.replace('/api', '')}${app.applicant.resume}" target="_blank" style="color: #0a66c2; font-size: 12px;">View Resume</a>` : 
                      ''
                    }
                  </div>
                </div>
              </td>
              <td>${app.applicant.email}</td>
              <td>${app.applicant.phone || 'N/A'}</td>
              <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${app.applicant.skills || 'N/A'}
              </td>
              <td>${new Date(app.createdAt).toLocaleDateString()}</td>
              <td>
                <span class="tag ${
                  app.status === 'accepted' ? 'success' : 
                  app.status === 'rejected' ? 'danger' : 
                  'warning'
                }">${app.status.toUpperCase()}</span>
              </td>
              <td>
                <div style="display: flex; gap: 5px;">
                  <button class="btn btn-primary" onclick="viewApplicantDetails('${app._id}')" style="padding: 5px 10px; font-size: 12px;">View</button>
                  ${app.status === 'pending' ? `
                    <button class="btn btn-success" onclick="updateStatus('${app._id}', 'accepted')" style="padding: 5px 10px; font-size: 12px;">Accept</button>
                    <button class="btn btn-danger" onclick="updateStatus('${app._id}', 'rejected')" style="padding: 5px 10px; font-size: 12px;">Reject</button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function viewApplicantDetails(applicationId) {
  const application = applications.find(app => app._id === applicationId);
  if (!application) return;
  
  const modal = document.getElementById('applicantModal');
  const modalContent = document.getElementById('applicantModalContent');
  
  const applicant = application.applicant;
  
  modalContent.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <div style="text-align: center; margin-bottom: 20px;">
      ${applicant.profilePhoto ? 
        `<img src="${API_URL.replace('/api', '')}${applicant.profilePhoto}" alt="${applicant.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px;">` :
        `<div style="width: 120px; height: 120px; border-radius: 50%; background: #0a66c2; color: white; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: bold; margin: 0 auto 15px;">${applicant.name.charAt(0)}</div>`
      }
      <h2>${applicant.name}</h2>
      <p style="color: #666;">${applicant.email}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h3 style="margin-bottom: 10px;">Contact Information</h3>
      <p><strong>Email:</strong> ${applicant.email}</p>
      <p><strong>Phone:</strong> ${applicant.phone || 'Not provided'}</p>
    </div>
    
    ${applicant.bio ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px;">Bio</h3>
        <p style="color: #666; line-height: 1.6;">${applicant.bio}</p>
      </div>
    ` : ''}
    
    ${applicant.skills ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px;">Skills</h3>
        <p style="color: #666;">${applicant.skills}</p>
      </div>
    ` : ''}
    
    ${application.coverLetter ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-bottom: 10px;">Cover Letter</h3>
        <p style="color: #666; line-height: 1.6;">${application.coverLetter}</p>
      </div>
    ` : ''}
    
    <div style="margin-bottom: 20px;">
      <h3 style="margin-bottom: 10px;">Application Status</h3>
      <span class="tag ${
        application.status === 'accepted' ? 'success' : 
        application.status === 'rejected' ? 'danger' : 
        'warning'
      }">${application.status.toUpperCase()}</span>
      <p style="color: #666; margin-top: 10px;">Applied on: ${new Date(application.createdAt).toLocaleDateString()}</p>
    </div>
    
    ${applicant.resume ? `
      <a href="${API_URL.replace('/api', '')}${applicant.resume}" target="_blank" class="btn btn-primary btn-block">
        Download Resume
      </a>
    ` : ''}
    
    ${application.status === 'pending' ? `
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button class="btn btn-success" style="flex: 1;" onclick="updateStatus('${application._id}', 'accepted'); closeModal();">Accept</button>
        <button class="btn btn-danger" style="flex: 1;" onclick="updateStatus('${application._id}', 'rejected'); closeModal();">Reject</button>
      </div>
    ` : ''}
  `;
  
  modal.classList.add('active');
}

async function updateStatus(applicationId, status) {
  const token = getToken();
  
  try {
    const response = await fetch(`${API_URL}/applications/${applicationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(`Application ${status}!`, 'success');
      const urlParams = new URLSearchParams(window.location.search);
      const jobId = urlParams.get('jobId');
      await loadApplicants(jobId);
    } else {
      showAlert(data.message || 'Failed to update status', 'error');
    }
  } catch (error) {
    console.error('Error updating status:', error);
    showAlert('Network error. Please try again.', 'error');
  }
}

function closeModal() {
  const modal = document.getElementById('applicantModal');
  modal.classList.remove('active');
}
t
function showAlert(message, type = 'success') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 4000);
  }
}

window.onclick = function(event) {
  const modal = document.getElementById('applicantModal');
  if (event.target === modal) {
    closeModal();
  }
};
