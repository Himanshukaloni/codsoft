const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: {
    type: [String],
    required: [true, 'Options are required'],
    validate: {
      validator: function(v) {
        return v && v.length === 4;
      },
      message: 'Each question must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: Number,
    required: [true, 'Correct answer index is required'],
    min: 0,
    max: 3
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  questions: {
    type: [questionSchema],
    required: [true, 'At least one question is required'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Quiz must have at least one question'
    }
  },
  timeLimit: {
    type: Number,
    default: 0,
    min: 0,
    max: 180 
  },
  attempts: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});


quizSchema.index({ createdBy: 1, createdAt: -1 });
quizSchema.index({ title: 'text', description: 'text' });
quizSchema.index({ category: 1 });
quizSchema.index({ isPublic: 1 });


quizSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});


quizSchema.methods.getPublicVersion = function() {
  const quiz = this.toObject();
  quiz.questions = quiz.questions.map(q => ({
    question: q.question,
    options: q.options,
    _id: q._id
  }));
  return quiz;
};

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
