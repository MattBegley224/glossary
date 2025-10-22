import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Plus, Book } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { database } from '@/services/database';
import { SubjectWithTermCount } from '@/types/database';
import { Colors } from '@/constants/colors';
import { useCallback } from 'react';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SubjectsScreen() {
  const colors = Colors.dark;

  const [subjects, setSubjects] = useState<SubjectWithTermCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [])
  );

  const loadSubjects = async () => {
    try {
      const data = await database.subjects.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };

  const handleSubjectPress = (subject: SubjectWithTermCount) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/subject/[id]',
      params: { id: subject.id, name: subject.name, color: subject.color },
    });
  };

  const handleAddSubject = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/subject/new');
  };

  const renderSubjectCard = ({ item, index }: { item: SubjectWithTermCount; index: number }) => (
    <AnimatedTouchable
      entering={FadeInDown.delay(index * 50).springify()}
      exiting={FadeOutUp}
      layout={Layout.springify()}
      onPress={() => handleSubjectPress(item)}
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      activeOpacity={0.7}>
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Book size={24} color={item.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.subjectName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.termCount, { color: colors.secondaryText }]}>
              {item.term_count} {item.term_count === 1 ? 'term' : 'terms'}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedTouchable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Book size={64} color={colors.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Subjects Yet</Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        Create your first subject to start building your glossary
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Subjects</Text>
      </View>

      <FlatList
        data={subjects}
        renderItem={renderSubjectCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.shadow }]}
        onPress={handleAddSubject}
        activeOpacity={0.8}>
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>
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
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  colorBar: {
    height: 4,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  termCount: {
    fontSize: 14,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
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
});
