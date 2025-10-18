import { Tabs } from 'expo-router';
import { Home, BookMarked, Star } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Subjects',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="terms"
        options={{
          title: 'All Terms',
          tabBarIcon: ({ size, color }) => <BookMarked size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ size, color }) => <Star size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
