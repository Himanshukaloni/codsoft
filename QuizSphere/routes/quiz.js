const express = require('express');
const { Quiz, QuizResult, User } = require('../models');
const authenticateToken = require('../middleware/auth');

const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const { search, category, difficulty, limit = 50 } = req.query;
    
    let query = { isPublic: true };

   
    if (search) {
      query.$text = { $search: search };
    }

   
    if (category && category !== 'all') {
      query.category = category;
    }

   
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    const quizzes = await Quiz.find(query)
      .select('-questions.correctAnswer')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(quizzes);

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ 
      message: 'Error fetching quizzes',
      error: error.message 
    });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

   
    const publicQuiz = quiz.getPublicVersion();
    res.json(publicQuiz);

  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ 
      message: 'Error fetching quiz',
      error: error.message 
    });
  }
});


router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, questions, timeLimit, category, difficulty, tags } = req.body;

   
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ 
        message: 'Title and at least one question are required' 
      });
    }

   
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length !== 4 || q.correctAnswer === undefined) {
        return res.status(400).json({ 
          message: `Invalid question structure at index ${i}` 
        });
      }
    }

    const quiz = new Quiz({
      title,
      description,
      questions,
      timeLimit: timeLimit || 0,
      category: category || 'General',
      difficulty: difficulty || 'Medium',
      tags: tags || [],
      createdBy: req.user.userId,
      creatorName: req.user.username
    });

    await quiz.save();

 
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { quizzesCreated: 1 }
    });

    res.status(201).json({ 
      message: 'Quiz created successfully', 
      quiz: quiz.getPublicVersion()
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ 
      message: 'Error creating quiz',
      error: error.message 
    });
  }
});


router.get('/user/my-quizzes', authenticateToken, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(quizzes);

  } catch (error) {
    console.error('Error fetching user quizzes:', error);
    res.status(500).json({ 
      message: 'Error fetching your quizzes',
      error: error.message 
    });
  }
});


router.post('/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers, timeTaken } = req.body;
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    
    if (!answers || answers.length !== quiz.questions.length) {
      return res.status(400).json({ 
        message: 'Invalid answers submitted' 
      });
    }

   
    let score = 0;
    const results = quiz.questions.map((question, index) => {
      const isCorrect = answers[index] === question.correctAnswer;
      if (isCorrect) score++;
      
      return {
        question: question.question,
        options: question.options,
        userAnswer: answers[index],
        correctAnswer: question.correctAnswer,
        isCorrect
      };
    });

    const percentage = (score / quiz.questions.length) * 100;

  
    const quizResult = new QuizResult({
      quizId: quiz._id,
      quizTitle: quiz.title,
      userId: req.user.userId,
      username: req.user.username,
      score,
      totalQuestions: quiz.questions.length,
      percentage,
      answers,
      timeTaken: timeTaken || 0
    });

    await quizResult.save();

  
    quiz.attempts += 1;
    quiz.averageScore = ((quiz.averageScore * (quiz.attempts - 1)) + score) / quiz.attempts;
    await quiz.save();

 
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { quizzesTaken: 1 }
    });

    res.json({
      score,
      totalQuestions: quiz.questions.length,
      percentage: percentage.toFixed(2),
      grade: quizResult.getGrade(),
      passed: quizResult.passed,
      results
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ 
      message: 'Error submitting quiz',
      error: error.message 
    });
  }
});


router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const leaderboard = await QuizResult.find({ quizId: req.params.id })
      .sort({ score: -1, completedAt: 1 })
      .limit(parseInt(limit))
      .select('username score percentage completedAt grade');

    res.json(leaderboard);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      message: 'Error fetching leaderboard',
      error: error.message 
    });
  }
});


router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const history = await QuizResult.find({ userId: req.user.userId })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .populate('quizId', 'title category');

    res.json(history);

  } catch (error) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ 
      message: 'Error fetching quiz history',
      error: error.message 
    });
  }
});


router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

 
    if (quiz.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'You can only edit your own quizzes' 
      });
    }

    const { title, description, category, difficulty, tags, isPublic } = req.body;

    if (title) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (category) quiz.category = category;
    if (difficulty) quiz.difficulty = difficulty;
    if (tags) quiz.tags = tags;
    if (isPublic !== undefined) quiz.isPublic = isPublic;

    await quiz.save();

    res.json({ 
      message: 'Quiz updated successfully', 
      quiz: quiz.getPublicVersion() 
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ 
      message: 'Error updating quiz',
      error: error.message 
    });
  }
});


router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

   
    if (quiz.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'You can only delete your own quizzes' 
      });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    await QuizResult.deleteMany({ quizId: req.params.id });

 
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { quizzesCreated: -1 }
    });

    res.json({ message: 'Quiz deleted successfully' });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ 
      message: 'Error deleting quiz',
      error: error.message 
    });
  }
});


router.get('/:id/stats', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const results = await QuizResult.find({ quizId: req.params.id });

    const stats = {
      totalAttempts: quiz.attempts,
      averageScore: quiz.averageScore,
      highestScore: results.length > 0 ? Math.max(...results.map(r => r.score)) : 0,
      lowestScore: results.length > 0 ? Math.min(...results.map(r => r.score)) : 0,
      passRate: results.length > 0 
        ? (results.filter(r => r.passed).length / results.length * 100).toFixed(2)
        : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({ 
      message: 'Error fetching quiz statistics',
      error: error.message 
    });
  }
});

module.exports = router;
