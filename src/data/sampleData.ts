import { DocumentItem, Question, QuizAttempt, Flashcard, StudyNote, Badge } from '../types';

export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-ai-ml',
    name: 'Artificial Intelligence & Machine Learning Overview.pdf',
    type: 'pdf',
    uploadDate: '2026-08-01',
    sizeFormatted: '1.4 MB',
    wordCount: 1450,
    summary: 'Comprehensive guide covering Supervised, Unsupervised, and Reinforcement Learning, Neural Networks, Loss Functions, and Transformers.',
    content: `Artificial Intelligence (AI) refers to the simulation of human intelligence in machines programmed to think, reason, and learn. Machine Learning (ML) is a subfield of AI focused on building algorithms that allow computers to learn from and make predictions based on data.

Key Paradigms:
1. Supervised Learning: The algorithm is trained on labeled data where inputs and target outputs are provided. Common tasks include Classification (e.g., spam detection) and Regression (e.g., house price prediction). Common algorithms: Linear Regression, Logistic Regression, Decision Trees, Random Forests, Support Vector Machines (SVM).

2. Unsupervised Learning: The algorithm deals with unlabeled data and discovers underlying patterns, structures, or clusters. Key methods: K-Means Clustering, Hierarchical Clustering, Principal Component Analysis (PCA) for dimensionality reduction, and Autoencoders.

3. Reinforcement Learning (RL): An agent learns by interacting with an environment, receiving rewards for favorable actions and penalties for unfavorable ones. Key concepts: Markov Decision Process (MDP), Q-Learning, Deep Q-Networks (DQN), Policy Gradients.

Deep Learning & Neural Networks:
Deep Learning utilizes Artificial Neural Networks (ANNs) with multiple hidden layers. Key architectures include:
- Convolutional Neural Networks (CNNs): Dominant in Computer Vision, leveraging spatial feature extraction through kernels and pooling.
- Recurrent Neural Networks (RNNs) & LSTMs: Designed for sequential data such as natural language or time series.
- Transformers: Self-attention mechanism that revolutionized NLP (GPT, BERT, Gemini), enabling parallel processing of sequence data without recurrent dependencies.

Evaluation Metrics:
- Accuracy: Ratio of correct predictions to total predictions.
- Precision: TP / (TP + FP) — proportion of positive identifications that were actually correct.
- Recall (Sensitivity): TP / (TP + FN) — proportion of actual positives that were correctly identified.
- F1-Score: Harmonic mean of Precision and Recall.
- Overfitting occurs when a model learns noise and training details to the extent that it negatively impacts performance on new test data. Regularization (L1/L2, Dropout) helps prevent overfitting.`
  },
  {
    id: 'doc-data-structures',
    name: 'Data Structures and Algorithms Summary.txt',
    type: 'txt',
    uploadDate: '2026-08-03',
    sizeFormatted: '480 KB',
    wordCount: 980,
    summary: 'Essential structures including Arrays, Linked Lists, Trees, Graphs, Hash Tables, and Big-O Time Complexity analysis.',
    content: `Data Structures are systematic ways to organize and store data so that operations can be performed efficiently.

1. Linear Data Structures:
- Arrays: Contiguous memory blocks with O(1) indexed access, but fixed size and O(n) insertion/deletion.
- Linked Lists: Dynamic nodes containing data and pointers. O(1) insertion/deletion if location is known, but O(n) sequential search.
- Stacks: LIFO (Last In, First Out) structure. Operations: push, pop, peek. Used in call stacks, undo mechanisms, and expression parsing.
- Queues: FIFO (First In, First Out) structure. Operations: enqueue, dequeue. Used in task scheduling, BFS algorithm.

2. Hash Tables:
Maps keys to values using a Hash Function. Average time complexity for insertion, lookup, and deletion is O(1). Collisions are handled via Chaining (linked lists) or Open Addressing (linear probing).

3. Trees & Graphs:
- Binary Search Trees (BST): Left child < root < right child. Average search, insertion, deletion O(log n), worst case O(n) if unbalanced. AVL and Red-Black trees maintain height balance for guaranteed O(log n).
- Binary Heaps: Min-Heap and Max-Heap used in Priority Queues and HeapSort.
- Graphs: Nodes (vertices) and Edges. Traversal algorithms:
  * Breadth-First Search (BFS): Uses a queue, finds shortest path in unweighted graphs. Time complexity O(V + E).
  * Depth-First Search (DFS): Uses a stack or recursion, explores as deep as possible. Time complexity O(V + E).

4. Sorting Algorithms:
- QuickSort: Divide and conquer algorithm using a pivot element. Average O(n log n), worst case O(n^2).
- MergeSort: Stable divide-and-conquer algorithm with guaranteed O(n log n) time complexity, requiring O(n) extra space.
- Binary Search: Works on sorted arrays by repeatedly halving the search interval. Time complexity O(log n).`
  }
];

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'mcq',
    question: 'Which evaluation metric represents the proportion of actual positive cases that were correctly identified by the model?',
    options: ['Precision', 'Recall (Sensitivity)', 'F1-Score', 'Accuracy'],
    correctAnswer: 'Recall (Sensitivity)',
    explanation: 'Recall (also called Sensitivity) is calculated as True Positives / (True Positives + False Negatives). It measures how many of the actual positive cases were successfully captured by the model.',
    difficulty: 'medium',
    topic: 'Machine Learning',
    sourceSnippet: 'Recall (Sensitivity): TP / (TP + FN) — proportion of actual positives that were correctly identified.'
  },
  {
    id: 'q2',
    type: 'mcq',
    question: 'What is the key mechanism in Transformer architectures that enables parallel processing of sequence data?',
    options: ['Recurrent Feedback Loop', 'Self-Attention Mechanism', 'Max Pooling Layers', 'Convolutional Kernels'],
    correctAnswer: 'Self-Attention Mechanism',
    explanation: 'Transformers rely on Self-Attention mechanisms that calculate dependencies between all tokens in a sequence simultaneously, eliminating sequential bottleneck of RNNs.',
    difficulty: 'medium',
    topic: 'Deep Learning',
    sourceSnippet: 'Transformers: Self-attention mechanism that revolutionized NLP...'
  },
  {
    id: 'q3',
    type: 'true_false',
    question: 'In a Hash Table, the average time complexity for key lookup is O(1).',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'With a good hash function and proper load factor, hash tables provide constant time O(1) average lookup performance.',
    difficulty: 'easy',
    topic: 'Data Structures',
    sourceSnippet: 'Average time complexity for insertion, lookup, and deletion is O(1).'
  },
  {
    id: 'q4',
    type: 'mcq',
    question: 'Which traversal algorithm uses a Queue data structure to find the shortest path in an unweighted graph?',
    options: ['Depth-First Search (DFS)', 'Breadth-First Search (BFS)', 'Dijkstra Algorithm', 'A* Search'],
    correctAnswer: 'Breadth-First Search (BFS)',
    explanation: 'BFS explores graph nodes layer by layer using a First-In First-Out (FIFO) queue, guaranteeing the shortest path in unweighted graphs.',
    difficulty: 'easy',
    topic: 'Graph Algorithms',
    sourceSnippet: 'Breadth-First Search (BFS): Uses a queue, finds shortest path in unweighted graphs.'
  },
  {
    id: 'q5',
    type: 'fill_blank',
    question: '__________ occurs when a machine learning model learns noise and specifics of training data too closely, degrading generalization on new unseen data.',
    correctAnswer: 'Overfitting',
    explanation: 'Overfitting happens when a model becomes overly complex and fits training noise, leading to high variance and poor test set accuracy.',
    difficulty: 'medium',
    topic: 'Machine Learning',
    sourceSnippet: 'Overfitting occurs when a model learns noise and training details...'
  }
];

export const SAMPLE_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    front: 'What is Precision in Classification?',
    back: 'Precision = TP / (TP + FP). It represents the proportion of positive identifications that were actually correct.',
    topic: 'Machine Learning',
    difficulty: 'medium',
    intervalDays: 1,
    reviewCount: 3
  },
  {
    id: 'fc-2',
    front: 'Difference between Stack and Queue?',
    back: 'Stack is LIFO (Last In, First Out). Queue is FIFO (First In, First Out).',
    topic: 'Data Structures',
    difficulty: 'easy',
    intervalDays: 3,
    reviewCount: 5
  },
  {
    id: 'fc-3',
    front: 'What is Self-Attention in Transformers?',
    back: 'A mechanism allowing every word in a sequence to weigh and relate to every other word, enabling parallel contextual processing.',
    topic: 'Deep Learning',
    difficulty: 'hard',
    intervalDays: 1,
    reviewCount: 2
  }
];

export const SAMPLE_BADGES: Badge[] = [
  {
    id: 'badge-streak-3',
    title: 'Study Flame',
    description: 'Maintain a 3-day active study streak',
    iconName: 'Flame',
    progress: 100,
    unlockedAt: '2026-08-04',
    category: 'streak'
  },
  {
    id: 'badge-quiz-master',
    title: 'Quiz Master',
    description: 'Score 100% on any quiz with 5+ questions',
    iconName: 'Award',
    progress: 100,
    unlockedAt: '2026-08-04',
    category: 'accuracy'
  },
  {
    id: 'badge-drive-connector',
    title: 'Cloud Scholar',
    description: 'Import study notes from Google Drive',
    iconName: 'FolderCloud',
    progress: 80,
    category: 'mastery'
  },
  {
    id: 'badge-exam-pro',
    title: 'Exam Veteran',
    description: 'Complete 3 timed Mock Exams',
    iconName: 'ShieldCheck',
    progress: 33,
    category: 'exam'
  }
];

export const SAMPLE_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'attempt-1',
    quizTitle: 'AI & Machine Learning Foundations',
    documentName: 'Artificial Intelligence & Machine Learning Overview.pdf',
    date: '2026-08-04',
    score: 80,
    totalQuestions: 5,
    correctCount: 4,
    timeSpentSeconds: 145,
    isExamMode: false,
    xpEarned: 120,
    questions: SAMPLE_QUESTIONS,
    answers: {
      'q1': { questionId: 'q1', userAnswer: 'Recall (Sensitivity)', isCorrect: true, confidence: 'high', timeSpentSeconds: 25 },
      'q2': { questionId: 'q2', userAnswer: 'Self-Attention Mechanism', isCorrect: true, confidence: 'high', timeSpentSeconds: 30 },
      'q3': { questionId: 'q3', userAnswer: 'True', isCorrect: true, confidence: 'high', timeSpentSeconds: 15 },
      'q4': { questionId: 'q4', userAnswer: 'Depth-First Search (DFS)', isCorrect: false, confidence: 'medium', timeSpentSeconds: 40 },
      'q5': { questionId: 'q5', userAnswer: 'Overfitting', isCorrect: true, confidence: 'high', timeSpentSeconds: 35 }
    }
  }
];
