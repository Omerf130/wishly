import * as ImagePicker from 'expo-image-picker';

export type PickDreamGalleryResult =
  | { status: 'picked'; uri: string }
  | { status: 'canceled' }
  | { status: 'error'; message: string };

export async function pickDreamGalleryImage(): Promise<PickDreamGalleryResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) {
        return {
          status: 'error',
          message: 'אין גישה לגלריה. אפשר לאפשר גישה להגדרות המכשיר.',
        };
      }
      return {
        status: 'error',
        message: 'נדרשת הרשאה לגלריה כדי לבחור תמונה לחלום.',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled) {
      return { status: 'canceled' };
    }

    const uri = result.assets[0]?.uri;
    if (!uri) {
      return { status: 'error', message: 'לא ניתן לקרוא את התמונה שנבחרה.' };
    }

    return { status: 'picked', uri };
  } catch {
    return { status: 'error', message: 'פתיחת הגלריה נכשלה. נסו שוב.' };
  }
}
