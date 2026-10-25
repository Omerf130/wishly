import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import {
  formatLocalDateYmdHebrew,
  localDateFromYmd,
  localYmdFromDate,
  startOfTodayLocal,
} from '@/utils/localCalendarDate';

type DreamSavingsPlanFieldsProps = {
  monthlyShekels: string;
  targetDateInput: string;
  monthlyError?: string;
  targetDateError?: string;
  onChangeMonthlyShekels: (value: string) => void;
  onChangeTargetDateInput: (value: string) => void;
  onFocusMonthly?: () => void;
};

export function DreamSavingsPlanFields({
  monthlyShekels,
  targetDateInput,
  monthlyError,
  targetDateError,
  onChangeMonthlyShekels,
  onChangeTargetDateInput,
  onFocusMonthly,
}: DreamSavingsPlanFieldsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const trimmedTargetDate = targetDateInput.trim();
  const hasTargetDate = trimmedTargetDate.length > 0;
  const targetDateLabel = hasTargetDate
    ? formatLocalDateYmdHebrew(trimmedTargetDate)
    : 'הוספת תאריך יעד';

  const pickerDate = useMemo(() => {
    const fromSaved = localDateFromYmd(trimmedTargetDate);
    if (fromSaved) {
      return fromSaved;
    }
    return startOfTodayLocal();
  }, [trimmedTargetDate, showDatePicker]);

  const minimumPickerDate = useMemo(() => startOfTodayLocal(), []);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const onDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') {
      return;
    }

    if (event.type === 'set' && selectedDate) {
      onChangeTargetDateInput(localYmdFromDate(selectedDate));
    }
  };

  const onRemoveTargetDate = () => {
    onChangeTargetDateInput('');
    setShowDatePicker(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>תכנון החיסכון שלי</Text>
      <Text style={styles.sectionHint}>
        התכנון הוא להכוונה בלבד. החיסכון מתעדכן רק כשמוסיפים כסף בפועל.
      </Text>

      <Text style={styles.label}>כמה ארצה לחסוך בכל חודש?</Text>
      <TextInput
        value={monthlyShekels}
        onChangeText={onChangeMonthlyShekels}
        onFocus={onFocusMonthly}
        placeholder="0 (אופציונלי)"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        style={[styles.input, monthlyError && styles.inputError]}
        textAlign="right"
      />
      {monthlyError ? <Text style={styles.fieldError}>{monthlyError}</Text> : null}

      <Text style={styles.label}>עד מתי ארצה להגיע ליעד?</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasTargetDate ? `תאריך יעד ${targetDateLabel}` : 'הוספת תאריך יעד'}
        onPress={openDatePicker}
        style={({ pressed }) => [
          styles.dateField,
          targetDateError && styles.inputError,
          pressed && styles.dateFieldPressed,
        ]}>
        <View style={styles.calendarIconWrap}>
          <SymbolView
            name={{ ios: 'calendar', android: 'calendar_month' }}
            size={22}
            tintColor={colors.primary}
            resizeMode="scaleAspectFit"
          />
        </View>
        <Text
          style={[styles.dateFieldText, !hasTargetDate && styles.dateFieldPlaceholder]}
          numberOfLines={2}>
          {targetDateLabel}
        </Text>
      </Pressable>
      {targetDateError ? <Text style={styles.fieldError}>{targetDateError}</Text> : null}

      {hasTargetDate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="הסרת תאריך יעד"
          onPress={onRemoveTargetDate}
          style={({ pressed }) => [styles.removeDateButton, pressed && styles.removeDatePressed]}>
          <Text style={styles.removeDateLabel}>הסרת תאריך</Text>
        </Pressable>
      ) : null}

      {showDatePicker ? (
        Platform.OS === 'ios' ? (
          <View style={styles.iosPickerWrap}>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="inline"
              minimumDate={minimumPickerDate}
              onChange={onDatePickerChange}
              locale="he-IL"
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDatePicker(false)}
              style={({ pressed }) => [styles.iosDoneButton, pressed && styles.removeDatePressed]}>
              <Text style={styles.iosDoneLabel}>סיום</Text>
            </Pressable>
          </View>
        ) : (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="calendar"
            minimumDate={minimumPickerDate}
            onChange={onDatePickerChange}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.stat,
    textAlign: 'right',
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionHint: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 14,
    lineHeight: 18,
  },
  label: {
    ...typography.stat,
    textAlign: 'right',
    marginBottom: 8,
  },
  input: {
    ...typography.body,
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.pink,
  },
  fieldError: {
    ...typography.caption,
    color: colors.pink,
    textAlign: 'right',
    marginBottom: 8,
  },
  dateField: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 8,
    minHeight: 52,
  },
  dateFieldPressed: {
    opacity: 0.94,
    backgroundColor: 'rgba(118, 86, 232, 0.06)',
  },
  calendarIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFieldText: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '600',
  },
  dateFieldPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  removeDateButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
  },
  removeDatePressed: {
    opacity: 0.9,
  },
  removeDateLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  iosPickerWrap: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 247, 236, 0.5)',
  },
  iosDoneButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 51, 75, 0.08)',
  },
  iosDoneLabel: {
    ...typography.stat,
    color: colors.primary,
    fontWeight: '700',
  },
});
