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


test('generates MCQs from realistic civil-engineering notes with action and purpose statements', () => {
  const engineeringText = [
    'Concrete is a composite material made from cement, water, fine aggregate and coarse aggregate.',
    'The water cement ratio affects the strength and workability of fresh concrete.',
    'Reinforced concrete combines concrete with steel reinforcement to resist tensile forces.',
    'A foundation transfers structural loads safely to the supporting soil.',
    'Slump testing is used to assess the workability of fresh concrete.',
    'Curing maintains sufficient moisture and temperature for concrete hydration.',
    'A benchmark is a fixed reference point used for surveying elevations.',
    'Compaction increases soil density by reducing air voids.',
    'The purpose of quality control is to verify that construction work meets specified requirements.',
    'A bill of quantities lists work items and their measured quantities.',
    'Personal protective equipment helps reduce exposure to construction site hazards.'
  ].join('\n');
  const analysis = analyzeLocalText(engineeringText, 20);
  assert.ok(analysis.notes.length >= 7, `expected multiple engineering facts, got ${analysis.notes.length}`);
  assert.ok(analysis.questions.length >= 4, `expected generated MCQs, got ${analysis.questions.length}`);
  for (const question of analysis.questions) {
    assert.equal(question.options.length, 4);
    assert.ok(question.options.includes(question.correctAnswer));
    assert.ok(question.question.endsWith('?'));
  }
});
