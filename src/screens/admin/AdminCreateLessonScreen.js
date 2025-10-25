import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { adminLessonService } from '../../services/lessonService';
import UniqueHeader from '../../components/UniqueHeader';

const formatDisplayDate = (date) =>
  Number.isNaN(date.getTime())
    ? '--/--'
    : date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

const formatDisplayTime = (date) =>
  Number.isNaN(date.getTime())
    ? '--:--'
    : date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

const formatTimeForSave = (date) =>
  Number.isNaN(date.getTime())
    ? '00:00'
    : date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_OPTIONS = [
  { key: 'monday', label: 'Pzt' },
  { key: 'tuesday', label: 'Sal' },
  { key: 'wednesday', label: 'Çar' },
  { key: 'thursday', label: 'Per' },
  { key: 'friday', label: 'Cum' },
  { key: 'saturday', label: 'Cmt' },
  { key: 'sunday', label: 'Paz' },
];

const DAY_LABELS = {
  monday: 'Pazartesi',
  tuesday: 'Salı',
  wednesday: 'Çarşamba',
  thursday: 'Perşembe',
  friday: 'Cuma',
  saturday: 'Cumartesi',
  sunday: 'Pazar',
};

const getDayKeyFromDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'monday';
  }
  return WEEKDAY_KEYS[date.getDay()] || 'monday';
};

const adjustDateToDay = (baseDate, targetKey) => {
  const targetIndex = WEEKDAY_KEYS.indexOf(targetKey);
  if (targetIndex === -1) {
    return baseDate;
  }

  const result = new Date(baseDate);
  const currentIndex = result.getDay();
  let diff = targetIndex - currentIndex;
  if (diff < 0) {
    diff += 7;
  }

  result.setDate(result.getDate() + diff);
  return result;
};

export default function AdminCreateLessonScreen({ navigation }) {
  const { user, userData } = useAuth();
  
  const scrollViewRef = useRef(null);
  const copyWeeksInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [maxStudents, setMaxStudents] = useState('12');
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [activePicker, setActivePicker] = useState(null);
  const [tempPickerValue, setTempPickerValue] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [selectedDays, setSelectedDays] = useState([getDayKeyFromDate(new Date())]);
  const [copyWeeks, setCopyWeeks] = useState('0');
  const isIOS = Platform.OS === 'ios';

  const lessonTypes = [
    'Pilates',
    'Yoga',
    'Reformer',
    'Mat Pilates',
    'Yoga Flow',
    'Yin Yoga',
    'Vinyasa',
    'Hatha Yoga',
  ];

  useEffect(() => {
    loadTrainers();
  }, []);

  // Initialize selected days when component mounts
  useEffect(() => {
    const currentDayKey = getDayKeyFromDate(new Date());
    setSelectedDays([currentDayKey]);
  }, []);

  const handleSelectDay = (dayKey) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayKey)) {
        // Remove day if already selected (but keep at least one)
        return prev.length > 1 ? prev.filter(d => d !== dayKey) : prev;
      } else {
        // Add day to selection
        return [...prev, dayKey];
      }
    });
  };

  const buildLessonPayload = (dayKey) => {
    const durationValue = parseInt(duration, 10) || 0;
    const capacityValue = parseInt(maxStudents, 10) || 0;
    const baseDate = scheduledDate instanceof Date ? new Date(scheduledDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      throw new Error('invalid-date');
    }

    // Adjust date to the specific day
    const adjustedDate = adjustDateToDay(baseDate, dayKey);
    adjustedDate.setSeconds(0, 0);

    const endDate = new Date(adjustedDate);
    endDate.setMinutes(endDate.getMinutes() + durationValue);

    return {
      title: title.trim(),
      description: description.trim(),
      type: type.trim(),
      maxStudents: capacityValue,
      maxParticipants: capacityValue,
      trainerId: selectedTrainer?.id,
      trainerName: selectedTrainer?.name,
      scheduledDate: adjustedDate.toISOString(),
      startTime: formatTimeForSave(adjustedDate),
      endTime: formatTimeForSave(endDate),
      duration: durationValue,
      dayOfWeek: dayKey,
      enrolledStudents: [],
      participants: [],
      currentParticipants: 0,
      status: 'active',
      level: 'all',
      createdBy: user.uid,
      updatedBy: user.uid,
    };
  };

  const loadTrainers = async () => {
    try {
      setLoadingTrainers(true);
      const q = query(
        collection(db, 'users'),
        where('role', 'in', ['instructor', 'admin'])
      );
      
      const querySnapshot = await getDocs(q);
      const trainersList = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trainersList.push({
          id: doc.id,
          name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          ...data,
        });
      });
      
      setTrainers(trainersList);
      
      // Auto-select current user if they are instructor/admin
      if (userData?.role === 'instructor' || userData?.role === 'admin') {
        const currentTrainer = trainersList.find(t => t.id === user.uid);
        if (currentTrainer) {
          setSelectedTrainer(currentTrainer);
        }
      }
    } catch (error) {
      console.error('Error loading trainers:', error);
      Alert.alert('Hata', 'Eğitmenler yüklenirken hata oluştu');
    } finally {
      setLoadingTrainers(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Hata', 'Lütfen ders başlığını girin');
      return;
    }
    if (!type.trim()) {
      Alert.alert('Hata', 'Lütfen ders türünü seçin');
      return;
    }
    if (!selectedTrainer) {
      Alert.alert('Hata', 'Lütfen eğitmen seçin');
      return;
    }
    if (!maxStudents || parseInt(maxStudents) < 1) {
      Alert.alert('Hata', 'Lütfen geçerli bir maksimum öğrenci sayısı girin');
      return;
    }
    if (!duration || parseInt(duration) < 15) {
      Alert.alert('Hata', 'Lütfen geçerli bir ders süresi girin (minimum 15 dakika)');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir gün seçin');
      return;
    }

    try {
      setLoading(true);

      const extraWeeks = parseInt(copyWeeks, 10);
      let totalCreated = 0;
      let totalCopied = 0;

      // Create lessons for each selected day
      for (const dayKey of selectedDays) {
        let lessonData;
        try {
          lessonData = buildLessonPayload(dayKey);
        } catch (payloadError) {
          if (payloadError.message === 'invalid-date') {
            Alert.alert('Hata', 'Seçilen tarih geçerli değil. Lütfen yeniden deneyin.');
            return;
          }
          throw payloadError;
        }

        const result = await adminLessonService.createLesson(lessonData);

        if (result.success) {
          totalCreated++;

          // Copy to future weeks if specified
          if (!Number.isNaN(extraWeeks) && extraWeeks > 0) {
            const copyResult = await adminLessonService.copyLessonToFutureWeeks(
              lessonData,
              extraWeeks
            );

            if (copyResult.success) {
              totalCopied += copyResult.createdCount || 0;
            }
          }
        }
      }

      const dayNames = selectedDays.map(d => DAY_LABELS[d]).join(', ');
      let successMessage = `${totalCreated} ders başarıyla oluşturuldu (${dayNames}).`;

      if (totalCopied > 0) {
        successMessage += `\n${totalCopied} ders ${extraWeeks} hafta boyunca kopyalandı.`;
      }

      Alert.alert('Başarılı', successMessage, [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating lesson:', error);
      Alert.alert('Hata', 'Ders oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots from 06:00 to 22:00 in 30-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
      if (hour < 22) {
        slots.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  const openPicker = (type) => {
    if (type === 'time') {
      // For time picker, find the current time slot
      const currentHour = scheduledDate.getHours();
      const currentMinute = scheduledDate.getMinutes();
      const currentSlot = timeSlots.find(
        slot => slot.hour === currentHour && slot.minute === currentMinute
      ) || timeSlots.find(slot => slot.hour === 9 && slot.minute === 0); // Default to 09:00
      setSelectedTimeSlot(currentSlot);
    } else {
      setTempPickerValue(new Date(scheduledDate));
    }
    setActivePicker(type);
  };

  const closePicker = () => {
    setActivePicker(null);
    setSelectedTimeSlot(null);
  };

  const handlePickerChange = (_, selectedValue) => {
    if (selectedValue) {
      setTempPickerValue(selectedValue);
    }
  };

  const handlePickerConfirm = () => {
    const newDate = new Date(scheduledDate);

    if (activePicker === 'date') {
      if (!tempPickerValue || Number.isNaN(tempPickerValue.getTime())) {
        closePicker();
        return;
      }
      newDate.setFullYear(
        tempPickerValue.getFullYear(),
        tempPickerValue.getMonth(),
        tempPickerValue.getDate()
      );
    } else if (activePicker === 'time') {
      if (!selectedTimeSlot) {
        closePicker();
        return;
      }
      newDate.setHours(selectedTimeSlot.hour, selectedTimeSlot.minute, 0, 0);
    }

    setScheduledDate(newDate);
    closePicker();
  };

  const handleCopyWeeksChange = (value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setCopyWeeks(sanitized);
  };

  if (loadingTrainers) {
    return (
      <View style={styles.container}>
        <UniqueHeader
          title="Yeni Ders"
          subtitle="Ders oluştur"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
          showNotification={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <UniqueHeader
        title="Yeni Ders"
        subtitle="Ders bilgilerini girin"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        showNotification={false}
      />

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ders Başlığı *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Örn: Sabah Yoga"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ders Türü *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeList}>
            {lessonTypes.map((lessonType) => (
              <TouchableOpacity
                key={lessonType}
                style={[styles.typeChip, type === lessonType && styles.typeChipActive]}
                onPress={() => setType(lessonType)}
              >
                <Text style={[styles.typeChipText, type === lessonType && styles.typeChipTextActive]}>
                  {lessonType}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Trainer */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Eğitmen *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trainerList}>
            {trainers.map((trainer) => (
              <TouchableOpacity
                key={trainer.id}
                style={[
                  styles.trainerChip,
                  selectedTrainer?.id === trainer.id && styles.trainerChipActive
                ]}
                onPress={() => setSelectedTrainer(trainer)}
              >
                <Ionicons 
                  name="person-circle" 
                  size={20} 
                  color={selectedTrainer?.id === trainer.id ? colors.white : colors.primary} 
                />
                <Text style={[
                  styles.trainerChipText,
                  selectedTrainer?.id === trainer.id && styles.trainerChipTextActive
                ]}>
                  {trainer.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ders hakkında detaylı bilgi..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Max Students & Duration */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Max Öğrenci *</Text>
            <TextInput
              style={styles.input}
              value={maxStudents}
              onChangeText={setMaxStudents}
              placeholder="12"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Süre (dk) *</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="60"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Day */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ders Günleri * (Çoklu Seçim)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayChipsContainer}
          >
            {DAY_OPTIONS.map(({ key, label: dayLabel }) => {
              const isActive = selectedDays.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.dayChip, isActive && styles.dayChipActive]}
                  onPress={() => handleSelectDay(key)}
                >
                  {isActive && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color={colors.white} 
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                    {dayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.helperText}>
            {selectedDays.length > 0 
              ? `Seçilen günler: ${selectedDays.map(d => DAY_LABELS[d]).join(', ')}`
              : 'Lütfen en az bir gün seçin'}
          </Text>
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tarih *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => openPicker('date')}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateText}>
              {formatDisplayDate(scheduledDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Saat *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => openPicker('time')}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.dateText}>
              {formatDisplayTime(scheduledDate)}
            </Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Sadece 30 dakikalık aralıklar seçilebilir (06:00, 06:30, 07:00, ...)
          </Text>
        </View>

        {/* Copy to future weeks */}
        <View style={styles.inputGroup} ref={copyWeeksInputRef}>
          <Text style={styles.label}>Diğer Haftalara Kopyala</Text>
          <View style={styles.copyInputRow}>
            <View style={styles.copyInputWrapper}>
              <TextInput
                style={styles.copyInput}
                value={copyWeeks}
                onChangeText={handleCopyWeeksChange}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={2}
                onFocus={() => {
                  // Scroll to make the input visible when keyboard opens
                  setTimeout(() => {
                    copyWeeksInputRef.current?.measureLayout(
                      scrollViewRef.current,
                      (x, y) => {
                        scrollViewRef.current?.scrollTo({
                          y: y - 100,
                          animated: true
                        });
                      },
                      () => {}
                    );
                  }, 100);
                }}
              />
              <Text style={styles.copyInputSuffix}>hafta</Text>
            </View>
          </View>
          <Text style={styles.helperText}>0 girerseniz yalnızca bu ders oluşturulur.</Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={colors.white} />
              <Text style={styles.createButtonText}>Ders Oluştur</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={Boolean(activePicker)}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <TouchableWithoutFeedback onPress={closePicker}>
          <View style={styles.pickerBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <View style={styles.pickerHeaderLeft}>
                    <View style={styles.pickerIconBadge}>
                      <Ionicons
                        name={activePicker === 'time' ? 'time-outline' : 'calendar-outline'}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.pickerTitle}>
                      {activePicker === 'time' ? 'Saat Seçin' : 'Tarih Seçin'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.pickerCloseButton} onPress={closePicker}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerBody}>
                  {Boolean(activePicker) && (
                    <>
                      <Text style={styles.pickerPreviewLabel}>
                        {activePicker === 'time' ? 'Seçilen Saat' : 'Seçilen Tarih'}
                      </Text>
                      <Text style={styles.pickerPreviewValue}>
                        {activePicker === 'time'
                          ? selectedTimeSlot?.label || '--:--'
                          : formatDisplayDate(tempPickerValue || new Date())}
                      </Text>
                      <View style={styles.pickerComponentWrapper}>
                        {activePicker === 'time' ? (
                          <ScrollView 
                            style={styles.timeSlotScroll}
                            showsVerticalScrollIndicator={false}
                          >
                            {timeSlots.map((slot) => (
                              <TouchableOpacity
                                key={slot.label}
                                style={[
                                  styles.timeSlotItem,
                                  selectedTimeSlot?.label === slot.label && styles.timeSlotItemActive
                                ]}
                                onPress={() => setSelectedTimeSlot(slot)}
                              >
                                <Text style={[
                                  styles.timeSlotText,
                                  selectedTimeSlot?.label === slot.label && styles.timeSlotTextActive
                                ]}>
                                  {slot.label}
                                </Text>
                                {selectedTimeSlot?.label === slot.label && (
                                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <DateTimePicker
                            value={tempPickerValue || new Date()}
                            mode="date"
                            display="spinner"
                            onChange={handlePickerChange}
                            minimumDate={new Date()}
                            locale="tr-TR"
                            style={styles.nativePicker}
                            {...(isIOS
                              ? {
                                  preferredDatePickerStyle: 'wheels',
                                  textColor: colors.textPrimary,
                                  accentColor: colors.primary,
                                  themeVariant: 'light',
                                }
                              : {})}
                          />
                        )}
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.pickerActions}>
                  <TouchableOpacity style={styles.pickerActionSecondary} onPress={closePicker}>
                    <Text style={styles.pickerActionSecondaryText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerActionPrimary} onPress={handlePickerConfirm}>
                    <Text style={styles.pickerActionPrimaryText}>Onayla</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  typeList: {
    marginTop: 4,
  },
  typeChip: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: colors.white,
  },
  dayChipsContainer: {
    paddingVertical: 4,
  },
  dayChip: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: colors.white,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  trainerList: {
    marginTop: 4,
  },
  trainerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trainerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  trainerChipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    marginLeft: 6,
  },
  trainerChipTextActive: {
    color: colors.white,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  copyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    width: 140,
  },
  copyInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  copyInputSuffix: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 10,
    ...colors.shadow,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  pickerCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    ...colors.shadow,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: `${colors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerBody: {
    borderRadius: 20,
    backgroundColor: colors.transparentGreenLight,
    paddingVertical: Platform.OS === 'ios' ? 18 : 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  pickerPreviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  pickerComponentWrapper: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${colors.primary}15`,
  },
  pickerActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  pickerActionSecondary: {
    flex: 1,
    backgroundColor: colors.transparentGreenLight,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  pickerActionSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pickerActionPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    ...colors.shadow,
  },
  pickerActionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  nativePicker: {
    width: '100%',
    ...Platform.select({
      ios: {
        height: 220,
      },
    }),
  },
  nativePickerTime: {
    ...Platform.select({
      ios: {
        height: 190,
      },
    }),
  },
  timeSlotScroll: {
    maxHeight: 300,
    width: '100%',
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  timeSlotItemActive: {
    backgroundColor: `${colors.primary}10`,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  timeSlotTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
