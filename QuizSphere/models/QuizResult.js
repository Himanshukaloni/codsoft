const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  quizTitle: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  answers: {
    type: [Number],
    required: true
  },
  timeTaken: {
    type: Number, 
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});


quizResultSchema.index({ quizId: 1, score: -1 });
quizResultSchema.index({ userId: 1, completedAt: -1 });
quizResultSchema.index({ quizId: 1, userId: 1 });


quizResultSchema.virtual('passed').get(function() {
  return this.percentage >= 60;
});

quizResultSchema.methods.getGrade = function() {
  if (this.percentage >= 90) return 'A';
  if (this.percentage >= 80) return 'B';
  if (this.percentage >= 70) return 'C';
  if (this.percentage >= 60) return 'D';
  return 'F';
};

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult;
