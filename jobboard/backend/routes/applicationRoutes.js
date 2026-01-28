const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

/**
 * @route   POST /api/applications
 * @desc    Apply for a job
 * @access  Private (Student only)
 */
router.post('/', auth, checkRole('student'), async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Job ID is required' 
      });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    if (!job.isActive) {
      return res.status(400).json({ 
        success: false, 
        message: 'This job is no longer accepting applications' 
      });
    }
    
    const student = await User.findById(req.user._id);
    
    if (!student.resume) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload your resume before applying' 
      });
    }
    
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user._id
    });
    
    if (existingApplication) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already applied for this job' 
      });
    }
    
    const application = await Application.create({
      job: jobId,
      applicant: req.user._id,
      coverLetter: coverLetter || '',
      applicantName: student.name,
      applicantEmail: student.email,
      applicantResume: student.resume,
      applicantSkills: student.skills
    });
    
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already applied for this job' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error submitting application',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/applications/my-applications
 * @desc    Get all applications submitted by current student
 * @access  Private (Student only)
 */
router.get('/my-applications', auth, checkRole('student'), async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate('job', 'title companyName location salary jobType')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching applications',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/applications/job/:jobId
 * @desc    Get all applications for a specific job
 * @access  Private (Recruiter only - own jobs)
 */
router.get('/job/:jobId', auth, checkRole('recruiter'), async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view applications for this job' 
      });
    }
    
    const applications = await Application.find({ job: jobId })
      .populate('applicant', 'name email profilePhoto')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: applications.length,
      job: {
        id: job._id,
        title: job.title,
        companyName: job.companyName
      },
      applications
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching applications',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/applications/:id/status
 * @desc    Update application status
 * @access  Private (Recruiter only)
 */
router.put('/:id/status', auth, checkRole('recruiter'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be pending, accepted, or rejected' 
      });
    }
    
    const application = await Application.findById(req.params.id).populate('job');
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    if (application.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this application' 
      });
    }
    
    application.status = status;
    await application.save();
    
    res.json({
      success: true,
      message: `Application ${status} successfully`,
      application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating application status',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/applications/:id
 * @desc    Get single application details
 * @access  Private (Student - own applications, Recruiter - applications for own jobs)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title description location salary jobType companyName')
      .populate('applicant', 'name email profilePhoto bio skills');
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    const isApplicant = application.applicant._id.toString() === req.user._id.toString();
    const isRecruiter = req.user.role === 'recruiter' && 
                       application.job.postedBy.toString() === req.user._id.toString();
    
    if (!isApplicant && !isRecruiter) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this application' 
      });
    }
    
    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching application',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/applications/:id
 * @desc    Withdraw application
 * @access  Private (Student only - own applications)
 */
router.delete('/:id', auth, checkRole('student'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({ 
        success: false, 
        message: 'Application not found' 
      });
    }
    
    if (application.applicant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to withdraw this application' 
      });
    }
    
    if (application.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot withdraw application that has been processed' 
      });
    }
    
    await Application.findByIdAndDelete(req.params.id);
    
    await Job.findByIdAndUpdate(application.job, { $inc: { applicationCount: -1 } });
    
    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Withdraw application error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error withdrawing application',
      error: error.message 
    });
  }
});

module.exports = router;
