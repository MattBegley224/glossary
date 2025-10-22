import { useState, useEffect, useCallback } from 'react';
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
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { database } from '@/services/database';
import { TermWithSubjects } from '@/types/database';
import { Colors } from '@/constants/colors';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function FavoritesScreen() {
  const colors = Colors.dark;

  const [favorites, setFavorites] = useState<TermWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      const data = await database.terms.getFavorites();
      setFavorites(data);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
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
                size={16}
                color={item.difficulty >= level ? '#F59E0B' : colors.secondaryText}
                fill={item.difficulty >= level ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
        )}
      </View>
      {item.subjects.length > 0 && (
        <View style={styles.subjectsContainer}>
          {item.subjects.map((subject) => (
            <View
              key={subject.id}
              style={[styles.subjectChip, { backgroundColor: subject.color + '20' }]}>
              <Text style={[styles.subjectChipText, { color: subject.color }]}>
                {subject.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </AnimatedTouchable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Star size={64} color={colors.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Favorites Yet</Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        Star your favorite terms to find them quickly here
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
      </View>

      <FlatList
        data={favorites}
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
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
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
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
