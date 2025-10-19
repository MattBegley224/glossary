import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Check, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { database } from '@/services/database';
import { Subject, TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';

export default function EditTermScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colorScheme = 'dark';
  const colors = Colors.dark;

  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [difficulty, setDifficulty] = useState(0);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [term, subjects] = await Promise.all([
        database.terms.getById(params.id),
        database.subjects.getAll(),
      ]);

      setName(term.name);
      setDefinition(term.definition);
      setDifficulty(term.difficulty);
      setSelectedSubjects(term.subjects.map((s) => s.id));
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Error loading term:', error);
      Alert.alert('Error', 'Failed to load term');
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a term name');
      return;
    }

    if (!definition.trim()) {
      Alert.alert('Error', 'Please enter a definition');
      return;
    }

    if (selectedSubjects.length === 0) {
      Alert.alert('Error', 'Please select at least one subject');
      return;
    }

    setSaving(true);
    try {
      await database.terms.update(params.id, {
        name: name.trim(),
        definition: definition.trim(),
        difficulty,
        subjectIds: selectedSubjects,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch (error) {
      console.error('Error updating term:', error);
      Alert.alert('Error', 'Failed to update term');
    } finally {
      setSaving(false);
    }
  };

  const handleDifficultySelect = (level: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDifficulty(difficulty === level ? 0 : level);
  };

  const toggleSubject = (subjectId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const isValid = name.trim() && definition.trim() && selectedSubjects.length > 0;

  if (loading) {
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
        <Text style={[styles.title, { color: colors.text }]}>Edit Term</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving || !isValid}>
          <Check size={24} color={!isValid ? colors.secondaryText : colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Term</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Enter term name"
            placeholderTextColor={colors.secondaryText}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Definition</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={definition}
            onChangeText={setDefinition}
            placeholder="Enter definition"
            placeholderTextColor={colors.secondaryText}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Difficulty (Optional)
          </Text>
          <View style={styles.difficultyContainer}>
            {[1, 2, 3].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => handleDifficultySelect(level)}
                style={styles.difficultyButton}
                activeOpacity={0.7}>
                <Star
                  size={32}
                  color={difficulty >= level ? '#F59E0B' : colors.secondaryText}
                  fill={difficulty >= level ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Subjects</Text>
          <View style={styles.subjectsContainer}>
            {availableSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject.id);
              return (
                <TouchableOpacity
                  key={subject.id}
                  onPress={() => toggleSubject(subject.id)}
                  style={[
                    styles.subjectChip,
                    {
                      backgroundColor: isSelected ? subject.color : colors.card,
                      borderColor: subject.color,
                    },
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.subjectChipText,
                      { color: isSelected ? '#ffffff' : subject.color },
                    ]}>
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 120,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  difficultyButton: {
    padding: 8,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
