import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  useColorScheme,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ChevronLeft, Search, Plus, BookOpen, Upload, Edit3, Check, X, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { database } from '@/services/database';
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';
import { ImportModal } from '@/components/ImportModal';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SubjectDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const params = useLocalSearchParams<{ id: string; name: string; color: string }>();

  const [terms, setTerms] = useState<TermWithSubjects[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<TermWithSubjects[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(params.name || '');
  const [currentName, setCurrentName] = useState(params.name || '');

  console.log('🔍 Render state - isEditingName:', isEditingName, 'editedName:', editedName);

  useEffect(() => {
    loadTerms();
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      loadTerms();
    }, [params.id])
  );

  useEffect(() => {
    if (params.name) {
      setCurrentName(params.name);
      if (!isEditingName) {
        setEditedName(params.name);
      }
    }
  }, [params.name]);

  useEffect(() => {
    filterTerms();
  }, [searchQuery, terms]);

  const loadTerms = async () => {
    if (!params.id) return;

    try {
      const data = await database.terms.getBySubject(params.id);
      setTerms(data);
    } catch (error) {
      console.error('Error loading terms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTerms = () => {
    if (!searchQuery.trim()) {
      setFilteredTerms(terms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = terms.filter(
      (term) =>
        term.name.toLowerCase().includes(query) ||
        term.definition.toLowerCase().includes(query)
    );
    setFilteredTerms(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTerms();
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleAddTerm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: '/term/new',
      params: { subjectId: params.id, subjectName: params.name },
    });
  };

  const handleImport = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowImportModal(true);
  };

  const handleEditName = () => {
    console.log('Edit name clicked, current isEditingName:', isEditingName);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditingName(true);
    console.log('Set isEditingName to true');
  };

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();

    if (!trimmedName) {
      if (Platform.OS === 'web') {
        alert('Subject name cannot be empty');
      } else {
        Alert.alert('Error', 'Subject name cannot be empty');
      }
      return;
    }

    try {
      console.log('Updating subject:', { id: params.id, name: trimmedName, color: params.color });
      const result = await database.subjects.update(params.id, trimmedName, params.color);
      console.log('Update result:', result);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setCurrentName(trimmedName);
      setIsEditingName(false);
      router.setParams({ name: trimmedName });
    } catch (error: any) {
      console.error('Error updating subject name:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      if (Platform.OS === 'web') {
        alert('Failed to update subject name:\n\n' + errorMessage);
      } else {
        Alert.alert('Error', 'Failed to update subject name: ' + errorMessage);
      }
    }
  };

  const handleCancelEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditedName(currentName);
    setIsEditingName(false);
  };

  const handleTermPress = (term: TermWithSubjects) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/term/[id]',
      params: { id: term.id },
    });
  };

  const renderTermCard = ({ item, index }: { item: TermWithSubjects; index: number }) => (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 30).springify()}
      exiting={FadeOutUp}
      layout={Layout.springify()}
      onPress={() => handleTermPress(item)}
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={[styles.termName, { color: colors.text }]}>{item.name}</Text>
        {item.difficulty > 0 && (
          <View style={styles.difficultyContainer}>
            {[1, 2, 3].map((level) => (
              <Star
                key={level}
                size={14}
                color={item.difficulty >= level ? '#F59E0B' : colors.secondaryText}
                fill={item.difficulty >= level ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
        )}
      </View>
    </AnimatedTouchable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BookOpen size={64} color={colors.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery ? 'No Terms Found' : 'No Terms Yet'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        {searchQuery
          ? 'Try adjusting your search'
          : 'Add your first term to this subject'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: params.color }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {isEditingName ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                selectTextOnFocus
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              <View style={styles.editActions}>
                <Pressable onPress={handleSaveName} style={[styles.editButton, styles.checkButton]}>
                  <Check size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable onPress={handleCancelEdit} style={styles.editButton}>
                  <X size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.headerTitle}>{currentName}</Text>
              <TouchableOpacity onPress={handleEditName} style={styles.editIconButton} activeOpacity={0.7}>
                <Edit3 size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
          <Search size={20} color="#FFFFFF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search terms..."
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredTerms}
        renderItem={renderTermCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
          onPress={handleImport}
          activeOpacity={0.8}>
          <Upload size={24} color={params.color} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: params.color, shadowColor: colors.shadow }]}
          onPress={handleAddTerm}
          activeOpacity={0.8}>
          <Plus size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {showImportModal && (
        <ImportModal
          visible={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={loadTerms}
          subjectId={params.id}
          subjectColor={params.color}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: 8,
  },
  definition: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    flexDirection: 'column',
    gap: 12,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'flex-end',
  },
  editContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
    paddingRight: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 40,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
    paddingRight: 24,
  },
  editButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
  },
  checkButton: {
    marginRight: 16,
  },
  editIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
