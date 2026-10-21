import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamCard } from '@/components/dreams/DreamCard';
import { NewDreamCard } from '@/components/dreams/NewDreamCard';
import { HomeHeader } from '@/components/home/HomeHeader';
import { colors } from '@/constants/theme';
import { mockDreams } from '@/data/mockDreams';

export default function DreamsHomeScreen() {
  const router = useRouter();

  const onPressSettings = () => {
    router.navigate('/settings' as Href);
  };

  const onPressAddDream = () => {
    Alert.alert('בקרוב', 'תהליך יצירת חלום חדש יתווסף בשלב הבא.', [{ text: 'הבנתי' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled
        alwaysBounceVertical={false}>
        <HomeHeader onPressSettings={onPressSettings} onPressAddDream={onPressAddDream} />

        <View style={styles.list}>
          {mockDreams.map((dream) => (
            <DreamCard key={dream.id} dream={dream} />
          ))}
          <NewDreamCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  list: {
    marginTop: 8,
  },
});
