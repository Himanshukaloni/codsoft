const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

/**
 * @route   POST /api/jobs
 * @desc    Create a new job posting
 * @access  Private (Recruiter only)
 */
router.post('/', auth, checkRole('recruiter'), async (req, res) => {
  try {
    const { title, description, location, salary, jobType, requirements, experienceLevel } = req.body;
    
    if (!title || !description || !location || !salary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }
    
    const recruiter = await User.findById(req.user._id);
    

    const job = await Job.create({
      title,
      description,
      location,
      salary,
      jobType: jobType || 'Full-time',
      requirements: requirements || '',
      experienceLevel: experienceLevel || 'Entry Level',
      postedBy: req.user._id,
      companyName: recruiter.companyName || recruiter.name,
      companyLogo: recruiter.companyLogo || ''
    });
    
    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating job',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jobs
 * @desc    Get all active jobs
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
   
    const { jobType, location, search } = req.query;
    
    let query = { isActive: true };
    
    if (jobType) {
      query.jobType = jobType;
    }
    
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const jobs = await Job.find(query)
      .populate('postedBy', 'name email companyName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching jobs',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('postedBy', 'name email companyName companyDescription');
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching job',
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/jobs/recruiter/my-jobs
 * @desc    Get all jobs posted by current recruiter
 * @access  Private (Recruiter only)
 */
router.get('/recruiter/my-jobs', auth, checkRole('recruiter'), async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error('Get recruiter jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching jobs',
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job posting
 * @access  Private (Recruiter only - own jobs)
 */
router.put('/:id', auth, checkRole('recruiter'), async (req, res) => {
  try {
    // Find job
    let job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this job' 
      });
    }
    
    const { title, description, location, salary, jobType, requirements, experienceLevel, isActive } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (location) updateData.location = location;
    if (salary) updateData.salary = salary;
    if (jobType) updateData.jobType = jobType;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (experienceLevel) updateData.experienceLevel = experienceLevel;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    job = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating job',
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job posting
 * @access  Private (Recruiter only - own jobs)
 */
router.delete('/:id', auth, checkRole('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }
    
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this job' 
      });
    }
    
    job.isActive = false;
    await job.save();
    
    res.json({
      success: true,
      message: 'Job deactivated successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error deleting job',
      error: error.message 
    });
  }
});

module.exports = router;
