import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  calculateScore,
  createQuiz,
  hasPassedQuiz,
  QUIZ_QUESTION_COUNT,
  UNLOCK_DURATION_MINUTES,
  type QuizQuestion,
} from '../../features/quiz/quiz';
import { unlockAppsForQuiz } from '../../lib/screenTime';

type QuizResult = {
  passed: boolean;
  score: number;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Le déblocage a échoué. Réessaie.';
}

export default function QuizScreen() {
  const [questions, setQuestions] = useState<QuizQuestion[]>(createQuiz);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const question = questions[questionIndex];

  const submitAnswer = async () => {
    if (selectedOption === null || unlocking) return;

    const updatedAnswers = [...answers, selectedOption];
    setAnswers(updatedAnswers);
    setSelectedOption(null);

    if (questionIndex < QUIZ_QUESTION_COUNT - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    const score = calculateScore(questions, updatedAnswers);
    const passed = hasPassedQuiz(score);
    setResult({ passed, score });

    if (!passed) return;

    setUnlocking(true);
    setErrorMessage(null);
    try {
      await unlockAppsForQuiz(UNLOCK_DURATION_MINUTES);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUnlocking(false);
    }
  };

  const retryQuiz = () => {
    setQuestions(createQuiz());
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setResult(null);
    setErrorMessage(null);
  };

  const score =
    result?.score ??
    calculateScore(questions.slice(0, answers.length), answers);
  const progress = result ? 1 : (questionIndex + 1) / QUIZ_QUESTION_COUNT;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour à l’accueil"
            onPress={() => router.replace('/')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.headerLabel}>LE QUIZ TEMPO</Text>
          <View style={styles.headerSpacer} />
        </View>

        {result ? (
          <View style={styles.resultCard}>
            <View style={[styles.resultIcon, result.passed && styles.resultIconSuccess]}>
              <Text style={styles.resultIconText}>{result.passed ? '✓' : '↻'}</Text>
            </View>
            <Text style={styles.eyebrow}>{result.passed ? 'BIEN JOUÉ' : 'ON RECOMMENCE ?'}</Text>
            <Text style={styles.resultTitle}>
              {result.passed ? 'Tu as gagné ta pause.' : 'Presque !'}
            </Text>
            <Text style={styles.resultDescription}>
              {errorMessage
                ? errorMessage
                : result.passed
                  ? `Tes apps sont débloquées pendant ${UNLOCK_DURATION_MINUTES} minutes. Elles seront ensuite rebloquées automatiquement.`
                  : `Tu as obtenu ${result.score}/${QUIZ_QUESTION_COUNT}. Il faut au moins 4 bonnes réponses pour débloquer tes apps.`}
            </Text>
            {unlocking ? (
              <ActivityIndicator color="#1A3D34" style={styles.resultSpinner} />
            ) : result.passed && !errorMessage ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Retour à Tempo</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={retryQuiz}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {result.passed ? 'Réessayer le déblocage' : 'Réessayer le quiz'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.eyebrow}>5 QUESTIONS · 4 BONNES RÉPONSES</Text>
            <Text style={styles.title}>Une pause,{'\n'}ça se mérite.</Text>
            <Text style={styles.intro}>
              Réponds correctement à au moins 4 questions pour débloquer tes apps pendant{' '}
              {UNLOCK_DURATION_MINUTES} minutes.
            </Text>

            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                QUESTION {questionIndex + 1} / {QUIZ_QUESTION_COUNT}
              </Text>
              <Text style={styles.progressScore}>{score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionNumber}>
                {String(questionIndex + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.questionText}>{question.prompt}</Text>
              <View style={styles.options}>
                {question.options.map((option, index) => {
                  const selected = selectedOption === index;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedOption(index)}
                      style={[styles.option, selected && styles.optionSelected]}
                    >
                      <View style={[styles.optionMarker, selected && styles.optionMarkerSelected]}>
                        {selected && <View style={styles.optionMarkerDot} />}
                      </View>
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={selectedOption === null}
              onPress={submitAnswer}
              style={[styles.primaryButton, selectedOption === null && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {questionIndex === QUIZ_QUESTION_COUNT - 1 ? 'Terminer le quiz' : 'Question suivante'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F8F4' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginBottom: 32 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#EAEEE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: '#1A3D34', fontSize: 32, lineHeight: 36, marginTop: -4 },
  headerLabel: { flex: 1, color: '#65716A', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  headerSpacer: { width: 40 },
  eyebrow: { color: '#6C8A66', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 10 },
  title: { color: '#19372F', fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1.6 },
  intro: { color: '#78817A', fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 26 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  progressLabel: { color: '#6C8A66', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  progressScore: { color: '#89918A', fontSize: 10, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: '#E8EBE4', overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: '100%', backgroundColor: '#A8C96A', borderRadius: 5 },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#EEF0EA',
    padding: 18,
    marginBottom: 17,
  },
  questionNumber: { color: '#B1C87D', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 9 },
  questionText: { color: '#20372F', fontSize: 20, lineHeight: 27, fontWeight: '800', marginBottom: 19 },
  options: { gap: 9 },
  option: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF0EA',
    paddingHorizontal: 12,
  },
  optionSelected: { backgroundColor: '#F4F7EB', borderColor: '#ADC779' },
  optionMarker: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9D0C6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  optionMarkerSelected: { borderColor: '#739347' },
  optionMarkerDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#739347' },
  optionText: { flex: 1, color: '#5D6961', fontSize: 13, fontWeight: '600' },
  optionTextSelected: { color: '#20372F', fontWeight: '700' },
  primaryButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: '#DDF18C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 3,
  },
  primaryButtonText: { color: '#213B2D', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.45 },
  resultCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
  },
  resultIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#FDE9E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultIconSuccess: { backgroundColor: '#EAF2D6' },
  resultIconText: { color: '#48633E', fontSize: 32, fontWeight: '700' },
  resultTitle: { color: '#19372F', fontSize: 30, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  resultDescription: { color: '#78817A', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 12, marginBottom: 22 },
  resultSpinner: { marginTop: 18 },
});
