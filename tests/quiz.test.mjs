import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateScore,
  createQuiz,
  hasPassedQuiz,
  QUIZ_QUESTION_COUNT,
} from '../src/features/quiz/quiz.ts';

test('a quiz contains five distinct valid questions', () => {
  const questions = createQuiz();

  assert.equal(questions.length, QUIZ_QUESTION_COUNT);
  assert.equal(new Set(questions.map((question) => question.id)).size, QUIZ_QUESTION_COUNT);
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.ok(question.answer >= 0 && question.answer < question.options.length);
  }
});

test('the quiz score is calculated against each question answer', () => {
  const questions = createQuiz(() => 0);
  const answers = questions.map((question) => question.answer);
  const oneWrongAnswer = [...answers];
  oneWrongAnswer[0] = (oneWrongAnswer[0] + 1) % questions[0].options.length;

  assert.equal(calculateScore(questions, answers), QUIZ_QUESTION_COUNT);
  assert.equal(calculateScore(questions, oneWrongAnswer), QUIZ_QUESTION_COUNT - 1);
});

test('four correct answers are required to pass', () => {
  assert.equal(hasPassedQuiz(3), false);
  assert.equal(hasPassedQuiz(4), true);
});
