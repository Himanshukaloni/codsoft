const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { authenticate, isStudent, isRecruiter } = require('../middleware/auth');


const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'profilePhoto') cb(null, 'uploads/profiles');
    else if (file.fieldname === 'companyLogo') cb(null, 'uploads/logos');
    else if (file.fieldname === 'resume') cb(null, 'uploads/resumes');
  },
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF resumes allowed'), false);
  } else {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});


const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};


router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.json({ success: false, message: 'All fields required' });
    }

    if (!['student', 'recruiter'].includes(role)) {
      return res.json({ success: false, message: 'Invalid role' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        companyLogo: user.companyLogo,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});


router.put(
  '/profile/student',
  authenticate,
  isStudent,
  upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const update = {
        name: req.body.name,
        bio: req.body.bio,
        skills: req.body.skills
      };

      if (req.files?.profilePhoto) {
        update.profilePhoto = '/' + req.files.profilePhoto[0].path;
      }
      if (req.files?.resume) {
        update.resume = '/' + req.files.resume[0].path;
      }

      const user = await User.findByIdAndUpdate(req.user._id, update, {
        new: true
      }).select('-password');

      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


router.put(
  '/profile/recruiter',
  authenticate,
  isRecruiter,
  upload.single('companyLogo'),
  async (req, res) => {
    try {
      const update = {
        name: req.body.name,
        companyName: req.body.companyName,
        companyDescription: req.body.companyDescription
      };

      if (req.file) {
        update.companyLogo = '/' + req.file.path;
      }

      const user = await User.findByIdAndUpdate(req.user._id, update, {
        new: true
      }).select('-password');

      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
