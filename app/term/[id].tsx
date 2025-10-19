import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Star, Edit2, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { database } from '@/services/database';
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';
import { linkifyDefinition } from '@/utils/termLinking';

export default function TermDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colorScheme = 'dark';
  const colors = Colors.dark;

  const [term, setTerm] = useState<TermWithSubjects | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadTerm();
    }
  }, [params.id]);

  const loadTerm = async () => {
    try {
      const data = await database.terms.getById(params.id);
      setTerm(data);
    } catch (error) {
      console.error('Error loading term:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/term/edit',
      params: { id: params.id },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Term',
      `Are you sure you want to delete "${term?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.terms.delete(params.id);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.back();
            } catch (error) {
              console.error('Error deleting term:', error);
              Alert.alert('Error', 'Failed to delete term');
            }
          },
        },
      ]
    );
  };

  const toggleFavorite = async () => {
    if (!term) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await database.terms.toggleFavorite(term.id, !term.is_favorite);
      setTerm({ ...term, is_favorite: !term.is_favorite });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleLinkedTermPress = async (linkedTermName: string) => {
    try {
      const linkedTerm = await database.terms.getByName(linkedTermName);
      if (linkedTerm) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        router.push({
          pathname: '/term/[id]',
          params: { id: linkedTerm.id },
        });
      }
    } catch (error) {
      console.error('Error finding linked term:', error);
    }
  };

  const renderDefinition = () => {
    if (!term) return null;

    const parts = linkifyDefinition(term.definition);
    return (
      <Text style={[styles.definition, { color: colors.text }]}>
        {parts.map((part, index) => {
          if (part.isLink && part.termName) {
            return (
              <Text
                key={index}
                style={[styles.linkedTerm, { color: colors.primary }]}
                onPress={() => handleLinkedTermPress(part.termName!)}>
                {part.text}
              </Text>
            );
          }
          return <Text key={index}>{part.text}</Text>;
        })}
      </Text>
    );
  };

  if (loading || !term) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleFavorite} style={styles.iconButton}>
            <Star
              size={24}
              color={term.is_favorite ? '#F59E0B' : colors.secondaryText}
              fill={term.is_favorite ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <Edit2 size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.termName, { color: colors.text }]}>{term.name}</Text>

        {term.difficulty > 0 && (
          <View style={styles.difficultyContainer}>
            <Text style={[styles.difficultyLabel, { color: colors.secondaryText }]}>
              Difficulty:
            </Text>
            {[1, 2, 3].map((level) => (
              <Star
                key={level}
                size={20}
                color={term.difficulty >= level ? '#F59E0B' : colors.secondaryText}
                fill={term.difficulty >= level ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
            Definition
          </Text>
          {renderDefinition()}
        </View>

        {term.subjects.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.secondaryText }]}>
              Subjects
            </Text>
            <View style={styles.subjectsContainer}>
              {term.subjects.map((subject) => (
                <View
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    { backgroundColor: subject.color + '20', borderColor: subject.color },
                  ]}>
                  <Text style={[styles.subjectChipText, { color: subject.color }]}>
                    {subject.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  termName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  definition: {
    fontSize: 18,
    lineHeight: 28,
  },
  linkedTerm: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
