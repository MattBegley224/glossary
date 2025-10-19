import { useState } from 'react';
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
import { ArrowLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { database } from '@/services/database';
import { Colors, SubjectColors } from '@/constants/colors';

export default function NewSubjectScreen() {
  const colorScheme = 'dark';
  const colors = Colors.dark;

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(SubjectColors[0]);
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a subject name');
      return;
    }

    setSaving(true);
    try {
      await database.subjects.create({
        name: name.trim(),
        color: selectedColor,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      router.back();
    } catch (error) {
      console.error('Error creating subject:', error);
      Alert.alert('Error', 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  const handleColorSelect = (color: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedColor(color);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>New Subject</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving || !name.trim()}>
          <Check size={24} color={!name.trim() ? colors.secondaryText : colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Subject Name</Text>
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
            placeholder="e.g., Biology, History, Mathematics"
            placeholderTextColor={colors.secondaryText}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Color</Text>
          <View style={styles.colorGrid}>
            {SubjectColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => handleColorSelect(color)}
                activeOpacity={0.7}>
                {selectedColor === color && (
                  <Check size={24} color="#ffffff" strokeWidth={3} />
                )}
              </TouchableOpacity>
            ))}
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
