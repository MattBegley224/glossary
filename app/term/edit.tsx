import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '@/services/database';
import { preferences } from '@/services/preferences';
import { Subject, TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';

export default function EditTermScreen() {
  const colors = Colors.dark;
  const params = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [textSizeMultiplier, setTextSizeMultiplier] = useState(preferences.getFontSizeMultiplier());
  const sliderWidth = useRef(0);
  const sliderX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
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
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    if (!params.id) return;

    try {
      const [termData, subjectsData] = await Promise.all([
        database.terms.getById(params.id),
        database.subjects.getAll(),
      ]);

      if (termData) {
        setName(termData.name);
        setDefinition(termData.definition);
        setSelectedSubjects(termData.subjects.map((s) => s.id));
      }

      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a term name');
      return;
    }

    if (!definition.trim()) {
      Alert.alert('Error', 'Please enter a definition');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setSaving(true);
    try {
      console.log('Updating term:', params.id, name.trim(), definition.trim(), selectedSubjects);
      const result = await database.terms.update(params.id, name.trim(), definition.trim(), selectedSubjects);
      console.log('Update result:', result);
      router.back();
    } catch (error) {
      console.error('Error updating term:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (Platform.OS === 'web') {
        alert(`Failed to update term: ${errorMessage}`);
      } else {
        Alert.alert('Error', `Failed to update term: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Term</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Term Name</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Enter term"
              placeholderTextColor={colors.secondaryText}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Definition</Text>
            <View style={styles.textAreaWrapper}>
              <View style={styles.textAreaGlow} pointerEvents="none">
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
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, color: colors.text, borderColor: colors.primary, borderWidth: 1, fontSize: 16 * textSizeMultiplier, lineHeight: 16 * textSizeMultiplier * 1.35 },
                ]}
                placeholder="Enter definition"
                placeholderTextColor={colors.secondaryText}
                value={definition}
                onChangeText={setDefinition}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.textSizeContainer}>
            <Text style={[styles.textSizeLabel, { color: colors.secondaryText }]}>A</Text>
            <View
              style={styles.sliderTrack}
              onLayout={(e) => {
                sliderWidth.current = e.nativeEvent.layout.width;
                sliderX.current = e.nativeEvent.layout.x;
              }}
              {...panResponder.panHandlers}>
              <View style={[styles.sliderFill, { width: `${(textSizeMultiplier - 0.5) / 1.5 * 100}%`, backgroundColor: colors.primary }]} />
              <View
                style={[styles.sliderThumb, { left: `${(textSizeMultiplier - 0.5) / 1.5 * 100}%`, backgroundColor: colors.primary }]}
              />
            </View>
            <Text style={[styles.textSizeLabel, styles.textSizeLabelLarge, { color: colors.secondaryText }]}>A</Text>
          </View>

          <View style={styles.subjectsContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Subjects</Text>
            <View style={styles.subjectsGrid}>
              {subjects.map((subject) => {
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
                        borderWidth: isSelected ? 0 : 1,
                      },
                    ]}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.subjectChipText,
                        { color: isSelected ? '#FFFFFF' : subject.color },
                      ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 20,
    paddingBottom: 20,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 300,
  },
  textAreaWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  textAreaGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    zIndex: 1,
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  glowBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    transform: [{ rotate: '180deg' }],
  },
  glowLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 14,
  },
  glowRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 14,
  },
  subjectsContainer: {
    marginBottom: 24,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  textSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
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
});
