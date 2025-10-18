import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
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
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';
import { parseDefinitionForLinks, TextSegment } from '@/utils/termLinking';

interface LinkedDefinitionProps {
  definition: string;
  allTerms: TermWithSubjects[];
  currentTermId: string;
  textColor: string;
  linkColor: string;
}

function LinkedDefinition({
  definition,
  allTerms,
  currentTermId,
  textColor,
  linkColor,
}: LinkedDefinitionProps) {
  const [showFullText, setShowFullText] = useState(false);
  const CHARACTER_LIMIT = 300;

  const segments = parseDefinitionForLinks(definition, allTerms, currentTermId);

  const handleTermPress = (termId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/term/${termId}`);
  };

  const handleToggleText = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFullText(!showFullText);
  };

  // Calculate total text length
  const totalLength = segments.reduce((sum, segment) => sum + segment.text.length, 0);
  const needsTruncation = totalLength > CHARACTER_LIMIT;

  // If showing full text or no truncation needed, render all segments
  if (showFullText || !needsTruncation) {
    return (
      <View>
        <Text style={[styles.definition, { color: textColor }]}>
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
        {needsTruncation && (
          <TouchableOpacity
            onPress={handleToggleText}
            style={styles.readMoreButton}
            activeOpacity={0.7}>
            <Text style={[styles.readMoreText, { color: linkColor }]}>Show Less</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Truncate segments to CHARACTER_LIMIT
  const truncatedSegments: TextSegment[] = [];
  let currentLength = 0;

  for (const segment of segments) {
    if (currentLength >= CHARACTER_LIMIT) break;

    const remainingSpace = CHARACTER_LIMIT - currentLength;
    if (segment.text.length <= remainingSpace) {
      truncatedSegments.push(segment);
      currentLength += segment.text.length;
    } else {
      // Truncate this segment
      const truncatedText = segment.text.slice(0, remainingSpace).trim() + '...';
      truncatedSegments.push({
        ...segment,
        text: truncatedText,
      });
      currentLength += truncatedText.length;
      break;
    }
  }

  return (
    <View>
      <Text style={[styles.definition, { color: textColor }]}>
        {truncatedSegments.map((segment, index) => {
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
      <TouchableOpacity
        onPress={handleToggleText}
        style={styles.readMoreButton}
        activeOpacity={0.7}>
        <Text style={[styles.readMoreText, { color: linkColor }]}>Read More</Text>
      </TouchableOpacity>
    </View>
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

  const flipProgress = useSharedValue(0);

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

  const handleToggleFavorite = async () => {
    if (!term) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await database.terms.toggleFavorite(term.id, !term.is_favorite);
      setTerm({ ...term, is_favorite: !term.is_favorite });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite');
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
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconButton} activeOpacity={0.7}>
            <Star
              size={24}
              color={term.is_favorite ? '#F59E0B' : colors.secondaryText}
              fill={term.is_favorite ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={styles.iconButton} activeOpacity={0.7}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={handleFlip} activeOpacity={0.9}>
            <View style={styles.cardContainer}>
              <Animated.View
                style={[
                  styles.card,
                  { backgroundColor: colors.card },
                  frontAnimatedStyle,
                  styles.cardFront,
                ]}>
                <Text style={[styles.cardLabel, { color: colors.secondaryText }]}>TERM</Text>
                <Text style={[styles.termName, { color: colors.text }]}>{term.name}</Text>
                <Text style={[styles.tapHint, { color: colors.secondaryText }]}>
                  Tap to see definition
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.card,
                  { backgroundColor: colors.card },
                  backAnimatedStyle,
                  styles.cardBack,
                ]}>
                <Text style={[styles.termName, { color: colors.text, marginBottom: 24 }]}>{term.name}</Text>
                <LinkedDefinition
                  definition={term.definition}
                  allTerms={allTerms}
                  currentTermId={term.id}
                  textColor={colors.text}
                  linkColor={colors.primary}
                />
              </Animated.View>
            </View>
          </TouchableOpacity>

          {term.subjects.length > 0 && (
            <View style={styles.subjectsSection}>
              <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>SUBJECTS</Text>
              <View style={styles.subjectsContainer}>
                {term.subjects.map((subject) => (
                  <View
                    key={subject.id}
                    style={[styles.subjectChip, { backgroundColor: subject.color + '20' }]}>
                    <Text style={[styles.subjectChipText, { color: subject.color }]}>
                      {subject.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleEdit}
            activeOpacity={0.7}>
            <Edit2 size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleDelete}
            activeOpacity={0.7}>
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
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
  cardContainer: {
    height: 300,
    marginBottom: 24,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
  },
  cardFront: {},
  cardBack: {},
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
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
  subjectsSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
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
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
