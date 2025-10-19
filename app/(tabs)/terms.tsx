import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  RefreshControl,
  Platform,
  ImageBackground,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Search, BookOpen, Star, ArrowUpDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { database } from '@/services/database';
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AllTermsScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [terms, setTerms] = useState<TermWithSubjects[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<TermWithSubjects[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty'>('name');

  useEffect(() => {
    loadTerms();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTerms();
    }, [])
  );

  useEffect(() => {
    filterTerms();
  }, [searchQuery, terms, sortBy]);

  const loadTerms = async () => {
    try {
      const data = await database.terms.getAll();
      setTerms(data);
    } catch (error) {
      console.error('Error loading terms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTerms = () => {
    let filtered = terms;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = terms.filter(
        (term) =>
          term.name.toLowerCase().includes(query) ||
          term.definition.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return (b.difficulty ?? 0) - (a.difficulty ?? 0);
      }
    });

    setFilteredTerms(sorted);
  };

  const toggleSort = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSortBy(sortBy === 'name' ? 'difficulty' : 'name');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTerms();
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
      style={[styles.card, { shadowColor: colors.shadow }]}
      activeOpacity={0.7}>
      <ImageBackground
        source={require('@/assets/images/buttons-red.png')}
        style={styles.buttonBackground}
        imageStyle={styles.buttonImage}
        resizeMode="cover">
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.termName, { color: '#FFFFFF' }]} numberOfLines={1}>{item.name}</Text>
            {item.difficulty > 0 && (
              <View style={styles.difficultyContainer}>
                {[1, 2, 3].map((level) => (
                  <Star
                    key={level}
                    size={16}
                    color={item.difficulty >= level ? '#FFF' : 'rgba(255, 255, 255, 0.4)'}
                    fill={item.difficulty >= level ? '#FFF' : 'transparent'}
                    strokeWidth={1.5}
                  />
                ))}
              </View>
            )}
          </View>
          {item.subjects.length > 0 && (
            <View style={styles.subjectsContainer}>
              {item.subjects.slice(0, 3).map((subject) => (
                <View
                  key={subject.id}
                  style={[styles.subjectChip, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                  <Text style={[styles.subjectChipText, { color: '#FFFFFF' }]}>
                    {subject.name}
                  </Text>
                </View>
              ))}
              {item.subjects.length > 3 && (
                <Text style={[styles.subjectChipText, { color: '#FFFFFF' }]}>+{item.subjects.length - 3}</Text>
              )}
            </View>
          )}
        </View>
      </ImageBackground>
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
          : 'Add your first term to start building your glossary'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>All Terms</Text>
          <TouchableOpacity
            onPress={toggleSort}
            style={[styles.sortButton, { backgroundColor: colors.card }]}
            activeOpacity={0.7}>
            <ArrowUpDown size={18} color={colors.primary} />
            <Text style={[styles.sortButtonText, { color: colors.primary }]}>
              {sortBy === 'name' ? 'Name' : 'Difficulty'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search terms..."
            placeholderTextColor={colors.secondaryText}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    minHeight: 80,
    overflow: 'hidden',
  },
  buttonBackground: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flex: 1,
  },
  buttonImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    gap: 8,
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
    marginBottom: 12,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '600',
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
});
