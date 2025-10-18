import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
  Alert,
  Share,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { X, Star, Edit2, Share2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { database } from '@/services/database';
import { preferences } from '@/services/preferences';
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';
import { parseDefinitionForLinks, TextSegment } from '@/utils/termLinking';

interface LinkedDefinitionProps {
  definition: string;
  allTerms: TermWithSubjects[];
  currentTermId: string;
  textColor: string;
  linkColor: string;
  fontSize: number;
}

function LinkedDefinition({
  definition,
  allTerms,
  currentTermId,
  textColor,
  linkColor,
  fontSize,
}: LinkedDefinitionProps) {
  const segments = parseDefinitionForLinks(definition, allTerms, currentTermId);

  const handleTermPress = (termId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace(`/term/${termId}`);
  };

  return (
    <Text style={[styles.definition, { color: textColor, fontSize, lineHeight: fontSize * 1.35 }]}>
      {segments.map((segment, index) => {
        if (segment.isLink && segment.termId) {
          return (
            <Text
              key={index}
              style={{ color: linkColor, textDecorationLine: 'underline' }}
              onPress={() => handleTermPress(segment.termId!)}>
              {segment.text}
            </Text>
          );
        }
        return <Text key={index}>{segment.text}</Text>;
      })}
    </Text>
  );
}

export default function TermDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const params = useLocalSearchParams<{ id: string }>();

  const [term, setTerm] = useState<TermWithSubjects | null>(null);
  const [allTerms, setAllTerms] = useState<TermWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(preferences.getFontSizeMultiplier());
  const sliderWidth = useRef(0);
  const sliderX = useRef(0);

  const flipProgress = useSharedValue(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const locationX = evt.nativeEvent.locationX;
        const percentage = Math.max(0, Math.min(1, locationX / sliderWidth.current));
        const newMultiplier = 0.5 + percentage * 1.5;
        setTextSizeMultiplier(newMultiplier);
        preferences.setFontSizeMultiplier(newMultiplier);
      },
      onPanResponderMove: (evt, gestureState) => {
        const x = gestureState.moveX - sliderX.current;
        const percentage = Math.max(0, Math.min(1, x / sliderWidth.current));
        const newMultiplier = 0.5 + percentage * 1.5;
        setTextSizeMultiplier(newMultiplier);
        preferences.setFontSizeMultiplier(newMultiplier);
      },
    })
  ).current;

  useEffect(() => {
    loadTerm();
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      loadTerm();
    }, [params.id])
  );

  useEffect(() => {
    if (!loading && term) {
      setIsFlipped(true);
      flipProgress.value = withTiming(1, { duration: 300 });
    }
  }, [loading, term]);

  const loadTerm = async () => {
    if (!params.id) return;

    try {
      const [termData, allTermsData] = await Promise.all([
        database.terms.getById(params.id),
        database.terms.getAll(),
      ]);
      setTerm(termData);
      setAllTerms(allTermsData);
    } catch (error) {
      console.error('Error loading term:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleFlip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsFlipped(!isFlipped);
    flipProgress.value = withTiming(isFlipped ? 0 : 1, { duration: 300 });
  };

  const handleDifficultyChange = async (difficulty: number) => {
    if (!term) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await database.terms.updateDifficulty(term.id, difficulty);
      setTerm({ ...term, difficulty });
    } catch (error) {
      console.error('Error updating difficulty:', error);
      Alert.alert('Error', 'Failed to update difficulty');
    }
  };

  const handleEdit = () => {
    if (!term) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    router.push({
      pathname: '/term/edit',
      params: { id: term.id },
    });
  };

  const handleShare = async () => {
    if (!term) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await Share.share({
        message: `${term.name}\n\n${term.definition}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = async () => {
    if (!term) return;

    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this term?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert('Delete Term', 'Are you sure you want to delete this term?', [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ]);
        });

    if (!confirmDelete) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      console.log('Attempting to delete term:', term.id);
      const result = await database.terms.delete(term.id);
      console.log('Delete result:', result);
      router.back();
    } catch (error) {
      console.error('Error deleting term:', error);
      if (Platform.OS === 'web') {
        alert(`Failed to delete term: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
        Alert.alert('Error', 'Failed to delete term');
      }
    }
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180]);
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0]);

    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360]);
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1]);

    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  if (loading || !term) {
    return (
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <StatusBar style="light" />

      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.difficultyWrapper}>
            {term.difficulty > 0 && (
              <Text style={[styles.difficultyLabel, { color: colors.secondaryText }]}>
                {term.difficulty === 1 ? 'EASY' : term.difficulty === 2 ? 'HARD' : 'DIFFICULT'}
              </Text>
            )}
            <View style={styles.difficultyContainer}>
              {[1, 2, 3].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => handleDifficultyChange(term.difficulty === level ? 0 : level)}
                  style={styles.starButton}
                  activeOpacity={0.7}>
                  <Star
                    size={20}
                    color={term.difficulty >= level ? '#F59E0B' : colors.secondaryText}
                    fill={term.difficulty >= level ? '#F59E0B' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {term.subjects.length > 0 && (
            <View style={styles.subjectsContainer}>
              {term.subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[styles.subjectChip, { backgroundColor: subject.color + '20' }]}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    router.push(`/subject/${subject.id}`);
                  }}
                  activeOpacity={0.7}>
                  <Text style={[styles.subjectChipText, { color: subject.color }]}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={handleClose} style={styles.iconButton} activeOpacity={0.7}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            <Animated.View
              style={[
                styles.card,
                { backgroundColor: colors.card },
                frontAnimatedStyle,
                styles.cardFront,
              ]}>
              <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} style={styles.cardTouchable}>
                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>TERM</Text>
                <Text style={[styles.termName, { color: colors.text }]}>{term.name}</Text>
                <Text style={[styles.tapHint, { color: colors.secondaryText }]}>
                  Tap to see definition
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 },
                backAnimatedStyle,
                styles.cardBack,
              ]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.cardScrollContent}
                style={styles.cardScroll}>
                <Text style={[styles.termName, { color: colors.text, marginBottom: 24 }]}>{term.name}</Text>
                <LinkedDefinition
                  definition={term.definition}
                  allTerms={allTerms}
                  currentTermId={term.id}
                  textColor={colors.text}
                  linkColor={colors.primary}
                  fontSize={18 * textSizeMultiplier}
                />
              </ScrollView>
              <View style={styles.cardInnerGlow} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                  style={styles.glowTop}
                />
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                  style={styles.glowBottom}
                />
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.glowLeft}
                />
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 0 }}
                  style={styles.glowRight}
                />
              </View>
            </Animated.View>
          </View>
        </ScrollView>

        <View style={styles.textSizeContainer}>
          <Text style={[styles.textSizeLabel, { color: colors.secondaryText }]}>A</Text>
          <View
            style={styles.sliderTrack}
            onLayout={(e) => {
              sliderWidth.current = e.nativeEvent.layout.width;
              e.nativeEvent.target.measureInWindow((x: number) => {
                sliderX.current = x;
              });
            }}
            {...panResponder.panHandlers}>
            <View style={[styles.sliderFill, { width: `${(textSizeMultiplier - 0.5) / 1.5 * 100}%`, backgroundColor: colors.primary }]} />
            <View
              style={[styles.sliderThumb, { left: `${(textSizeMultiplier - 0.5) / 1.5 * 100}%`, backgroundColor: colors.primary }]}
            />
          </View>
          <Text style={[styles.textSizeLabel, styles.textSizeLabelLarge, { color: colors.secondaryText }]}>A</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}
            onPress={handleEdit}
            activeOpacity={0.7}>
            <View style={styles.buttonGlow} pointerEvents="none">
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                style={styles.buttonGlowTop}
              />
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                style={styles.buttonGlowBottom}
              />
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGlowLeft}
              />
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.5)', 'rgba(59, 130, 246, 0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={styles.buttonGlowRight}
              />
            </View>
            <Edit2 size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.error, borderWidth: 1 }]}
            onPress={handleDelete}
            activeOpacity={0.7}>
            <View style={styles.buttonGlow} pointerEvents="none">
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0)']}
                style={styles.buttonGlowTop}
              />
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0)']}
                style={styles.buttonGlowBottom}
              />
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGlowLeft}
              />
              <LinearGradient
                colors={['rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 0 }}
                style={styles.buttonGlowRight}
              />
            </View>
            <Trash2 size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 0,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  iconButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyWrapper: {
    position: 'absolute',
    left: 20,
    alignItems: 'center',
    gap: 2,
    zIndex: 10,
  },
  difficultyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  cardContainer: {
    minHeight: 385,
    marginBottom: 5,
  },
  card: {
    position: 'absolute',
    width: '100%',
    borderRadius: 20,
    padding: 32,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    minHeight: '100%',
    flex: 1,
  },
  cardInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
    transform: [{ rotate: '180deg' }],
  },
  glowLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 15,
  },
  glowRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 15,
  },
  cardTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardScroll: {
    width: '100%',
  },
  cardScrollContent: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingBottom: 60,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  termName: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  definition: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  readMoreButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  readMoreText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  tapHint: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 5,
    gap: 12,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: -8,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  textSizeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  textSizeLabelLarge: {
    fontSize: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 5,
    paddingBottom: 13,
    marginTop: 5,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  buttonGlowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 7,
  },
  buttonGlowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 7,
    transform: [{ rotate: '180deg' }],
  },
  buttonGlowLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 7,
  },
  buttonGlowRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 7,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
