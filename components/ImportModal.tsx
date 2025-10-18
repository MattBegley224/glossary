import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { database } from '@/services/database';
import { parseJSON, parseCSV, ImportedTerm } from '@/utils/fileImport';
import { Colors } from '@/constants/colors';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  subjectId: string;
  subjectColor: string;
}

export function ImportModal({ visible, onClose, onImportSuccess, subjectId, subjectColor }: ImportModalProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedTerm[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePickFile = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.csv';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        setFileName(file.name);
        setImporting(true);

        try {
          const content = await file.text();

          let importResult;
          if (file.name.endsWith('.json')) {
            importResult = await parseJSON(content);
          } else if (file.name.endsWith('.csv')) {
            importResult = await parseCSV(content);
          } else {
            Alert.alert('Error', 'Unsupported file format. Please use .json or .csv files');
            setFileName(null);
            setImporting(false);
            return;
          }

          if (importResult.success) {
            setPreview(importResult.terms);
            setErrors(importResult.errors);
          } else {
            Alert.alert('Import Error', importResult.errors.join('\n'));
            setFileName(null);
            setPreview([]);
            setErrors([]);
          }
        } catch (error) {
          console.error('Error reading file:', error);
          Alert.alert('Error', 'Failed to read file');
          setFileName(null);
        } finally {
          setImporting(false);
        }
      };

      input.click();
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setImporting(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const term of preview) {
        try {
          await database.terms.create(term.name, term.definition, [subjectId]);
          successCount++;
        } catch (error) {
          console.error(`Error importing term "${term.name}":`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        onImportSuccess();
        Alert.alert(
          'Import Complete',
          `Successfully imported ${successCount} term${successCount === 1 ? '' : 's'}${failCount > 0 ? `\n${failCount} failed` : ''}`
        );
        onClose();
      } else {
        Alert.alert('Import Failed', 'No terms could be imported');
      }
    } catch (error) {
      console.error('Error importing terms:', error);
      Alert.alert('Error', 'Failed to import terms');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFileName(null);
    setPreview([]);
    setErrors([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Import Terms</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoBox, { backgroundColor: subjectColor + '20' }]}>
            <Text style={[styles.infoText, { color: subjectColor }]}>
              Upload a JSON or CSV file with terms and definitions
            </Text>
          </View>

          <View style={styles.formatSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Supported Formats</Text>

            <View style={[styles.formatCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formatLabel, { color: colors.text }]}>CSV Format:</Text>
              <Text style={[styles.formatExample, { color: colors.secondaryText }]}>
                name,definition{'\n'}
                Photosynthesis,"Process by which plants convert light..."
              </Text>
            </View>

            <View style={[styles.formatCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formatLabel, { color: colors.text }]}>JSON Format:</Text>
              <Text style={[styles.formatExample, { color: colors.secondaryText }]}>
                {'['}
                {'\n  '}{'{'}"name": "Mitosis", "definition": "Cell division..."{'}'}
                {'\n'}
                {']'}
              </Text>
            </View>
          </View>

          {!fileName && (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: subjectColor }]}
              onPress={handlePickFile}
              disabled={importing}
              activeOpacity={0.8}>
              <Upload size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Choose File</Text>
            </TouchableOpacity>
          )}

          {fileName && preview.length > 0 && (
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <FileText size={20} color={colors.text} />
                <Text style={[styles.fileName, { color: colors.text }]}>{fileName}</Text>
                <CheckCircle2 size={20} color="#10B981" />
              </View>

              <Text style={[styles.previewCount, { color: colors.secondaryText }]}>
                {preview.length} term{preview.length === 1 ? '' : 's'} ready to import
              </Text>

              {errors.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + '20' }]}>
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.length} error{errors.length === 1 ? '' : 's'} found (will be skipped)
                  </Text>
                </View>
              )}

              <View style={styles.previewList}>
                {preview.slice(0, 5).map((term, index) => (
                  <View key={index} style={[styles.previewItem, { backgroundColor: colors.card }]}>
                    <Text style={[styles.previewTermName, { color: colors.text }]} numberOfLines={1}>
                      {term.name}
                    </Text>
                    <Text style={[styles.previewDefinition, { color: colors.secondaryText }]} numberOfLines={2}>
                      {term.definition}
                    </Text>
                  </View>
                ))}
                {preview.length > 5 && (
                  <Text style={[styles.moreText, { color: colors.secondaryText }]}>
                    and {preview.length - 5} more...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: subjectColor }]}
                onPress={handleImport}
                disabled={importing}
                activeOpacity={0.8}>
                {importing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Import {preview.length} Terms</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.card }]}
                onPress={() => {
                  setFileName(null);
                  setPreview([]);
                  setErrors([]);
                }}
                disabled={importing}
                activeOpacity={0.8}>
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Choose Different File</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  formatSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  formatCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formatExample: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 40,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 40,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  previewCount: {
    fontSize: 14,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewList: {
    marginBottom: 16,
  },
  previewItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewTermName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewDefinition: {
    fontSize: 13,
    lineHeight: 18,
  },
  moreText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
