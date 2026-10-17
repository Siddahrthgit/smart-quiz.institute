import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeLocalText, generateLocalQuestions } from './localQuizEngine';

const studyText = [
  'Reinforced concrete uses steel bars to resist tensile forces.',
  'A theodolite measures horizontal and vertical angles in surveying.',
  'Water cement ratio controls concrete compressive strength.',
  'A total station determines coordinates from measured angles and distances.',
  'Surveying measures horizontal distances and vertical angles accurately.',
  'Concrete consists of cement, water, and aggregates.',
].join('\n');

test('extracts facts and generates MCQs from ordinary study text', () => {
  const analysis = analyzeLocalText(studyText, 20);
  assert.ok(analysis.notes.length >= 4, 'should extract several study notes');
  assert.ok(analysis.questions.length >= 4, 'should generate questions when there are enough distinct answers');

  for (const question of analysis.questions) {
    assert.ok(question.question.endsWith('?'));
    assert.equal(question.options.length, 4);
    assert.ok(question.options.includes(question.correctAnswer));
  }
});

test('respects the requested question count when enough facts are available', () => {
  const questions = generateLocalQuestions(studyText, 3);
  assert.equal(questions.length, 3);
});

test('returns no fabricated questions when the input has no extractable facts', () => {
  const questions = generateLocalQuestions('Welcome to the course. Thank you for reading.', 10);
  assert.equal(questions.length, 0);
});
