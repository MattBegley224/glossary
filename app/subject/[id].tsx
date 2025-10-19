import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Plus, BookOpen, Star, Upload, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { database } from '@/services/database';
import { Term } from '@/types/database';
import { Colors } from '@/constants/colors';
import { ImportModal } from '@/components/ImportModal';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ id: string; name: string; color: string }>();
  const colorScheme = 'dark';
  const colors = Colors.dark;

  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadTerms();
    }
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      if (params.id) {
        loadTerms();
      }
    }, [params.id])
  );

  const loadTerms = async () => {
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
      params: { subjectId: params.id, subjectName: params.name, subjectColor: params.color },
    });
  };

  const handleImport = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowImportModal(true);
  };

  const handleDeleteSubject = () => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${params.name}"? This will also delete all ${terms.length} terms in this subject.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.subjects.delete(params.id);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              router.back();
            } catch (error) {
              console.error('Error deleting subject:', error);
              Alert.alert('Error', 'Failed to delete subject');
            }
          },
        },
      ]
    );
  };

  const handleTermPress = (term: Term) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/term/[id]',
      params: { id: term.id },
    });
  };

  const renderTermCard = ({ item, index }: { item: Term; index: number }) => (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 30).springify()}
      exiting={FadeOutUp}
      layout={Layout.springify()}
      onPress={() => handleTermPress(item)}
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={[styles.termName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
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
      <Text style={[styles.definition, { color: colors.secondaryText }]} numberOfLines={2}>
        {item.definition}
      </Text>
    </AnimatedTouchable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BookOpen size={64} color={colors.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Terms Yet</Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        Add your first term or import terms from a file
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={[styles.colorDot, { backgroundColor: params.color }]} />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {params.name}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDeleteSubject} style={styles.deleteButton}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.termCount, { color: colors.secondaryText }]}>
          {terms.length} {terms.length === 1 ? 'term' : 'terms'}
        </Text>
      </View>

      <FlatList
        data={terms}
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
          style={[styles.fabSecondary, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
          onPress={handleImport}
          activeOpacity={0.8}>
          <Upload size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
          onPress={handleAddTerm}
          activeOpacity={0.8}>
          <Plus size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ImportModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          setShowImportModal(false);
          loadTerms();
        }}
        subjectId={params.id}
        subjectColor={params.color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  termCount: {
    fontSize: 14,
    marginLeft: 48,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  termName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
