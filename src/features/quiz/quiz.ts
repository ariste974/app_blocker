export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answer: number;
};

export const QUIZ_QUESTION_COUNT = 5;
export const QUIZ_PASS_SCORE = 4;
export const UNLOCK_DURATION_MINUTES = 15;

const questionBank: QuizQuestion[] = [
  {
    id: 'red-planet',
    prompt: 'Quelle planète est surnommée la planète rouge ?',
    options: ['Vénus', 'Mars', 'Jupiter', 'Mercure'],
    answer: 1,
  },
  {
    id: 'ocean',
    prompt: 'Quel est le plus grand océan du monde ?',
    options: ['Atlantique', 'Indien', 'Pacifique', 'Arctique'],
    answer: 2,
  },
  {
    id: 'symphony',
    prompt: 'Qui a composé la Neuvième Symphonie ?',
    options: ['Mozart', 'Beethoven', 'Bach', 'Chopin'],
    answer: 1,
  },
  {
    id: 'water',
    prompt: 'Quelle est la formule chimique de l’eau ?',
    options: ['CO₂', 'O₂', 'NaCl', 'H₂O'],
    answer: 3,
  },
  {
    id: 'capital-japan',
    prompt: 'Quelle est la capitale du Japon ?',
    options: ['Kyoto', 'Tokyo', 'Osaka', 'Séoul'],
    answer: 1,
  },
  {
    id: 'light-year',
    prompt: 'Une année-lumière mesure…',
    options: ['Une durée', 'Une distance', 'Une vitesse', 'Une température'],
    answer: 1,
  },
  {
    id: 'giraffe',
    prompt: 'Quel est le plus grand animal terrestre ?',
    options: ['L’éléphant d’Afrique', 'La girafe', 'L’ours polaire', 'Le rhinocéros blanc'],
    answer: 1,
  },
  {
    id: 'photosynthesis',
    prompt: 'Quel gaz les plantes absorbent-elles principalement pour la photosynthèse ?',
    options: ['Oxygène', 'Azote', 'Dioxyde de carbone', 'Hélium'],
    answer: 2,
  },
  {
    id: 'chess',
    prompt: 'Combien de cases compte un échiquier ?',
    options: ['56', '64', '72', '81'],
    answer: 1,
  },
  {
    id: 'everest',
    prompt: 'Dans quelle chaîne de montagnes se trouve l’Everest ?',
    options: ['Les Alpes', 'Les Andes', 'L’Himalaya', 'Les Rocheuses'],
    answer: 2,
  },
  {
    id: 'octagon',
    prompt: 'Combien de côtés possède un octogone ?',
    options: ['Six', 'Sept', 'Huit', 'Neuf'],
    answer: 2,
  },
  {
    id: 'currency-euro',
    prompt: 'Quelle monnaie est utilisée au Portugal ?',
    options: ['L’euro', 'Le peso', 'La livre', 'Le franc'],
    answer: 0,
  },
];

export function createQuiz(random: () => number = Math.random): QuizQuestion[] {
  const shuffled = [...questionBank];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, QUIZ_QUESTION_COUNT);
}

export function calculateScore(
  questions: readonly QuizQuestion[],
  answers: readonly number[],
): number {
  return questions.reduce(
    (score, question, index) => score + Number(answers[index] === question.answer),
    0,
  );
}

export function hasPassedQuiz(score: number): boolean {
  return score >= QUIZ_PASS_SCORE;
}
