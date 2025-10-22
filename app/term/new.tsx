import { useState, useEffect } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { database } from '@/services/database';
import { Subject } from '@/types/database';
import { Colors } from '@/constants/colors';

export default function NewTermScreen() {
  const colors = Colors.dark;
  const params = useLocalSearchParams<{ subjectId?: string; subjectName?: string }>();

  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    params.subjectId ? [params.subjectId] : []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentSubject();
  }, []);

  const loadCurrentSubject = async () => {
    if (!params.subjectId) return;

    try {
      const data = await database.subjects.getAll();
      const subject = data.find(s => s.id === params.subjectId);
      if (subject) {
        setCurrentSubject(subject);
      }
    } catch (error) {
      console.error('Error loading subject:', error);
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
      await database.terms.create(name.trim(), definition.trim(), selectedSubjects);
      router.back();
    } catch (error) {
      console.error('Error creating term:', error);
      Alert.alert('Error', 'Failed to create term');
    } finally {
      setSaving(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>New Term</Text>
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
              autoFocus
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Definition</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
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

          {currentSubject && (
            <View style={styles.subjectsContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
              <View
                style={[
                  styles.subjectChip,
                  { backgroundColor: currentSubject.color },
                ]}>
                <Text style={[styles.subjectChipText, { color: '#FFFFFF' }]}>
                  {currentSubject.name}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>{saving ? 'Creating...' : 'Create Term'}</Text>
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
    minHeight: 120,
  },
  subjectsContainer: {
    marginBottom: 24,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
});
