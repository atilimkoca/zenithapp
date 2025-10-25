import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { lessonService, getCategoryInfo } from '../services/lessonService';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import UniqueHeader from '../components/UniqueHeader';

const { width } = Dimensions.get('window');

// Helper function to safely translate lesson descriptions
const translateLessonDescription = (t, description) => {
  if (!description) return '';
  const translationKey = `lessonDescriptions.${description}`;
  const translated = t(translationKey);
  return translated === translationKey ? description : translated;
};

export default function ClassSelectionScreen() {
  const { user } = useAuth();
  const { t, language: currentLanguage } = useI18n();
  const [lessons, setLessons] = useState([]);
  const [groupedLessons, setGroupedLessons] = useState([]);
  const [filteredGroupedLessons, setFilteredGroupedLessons] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const scrollY = new Animated.Value(0);
  
  // Filter options (replacing categories)
  const filterOptions = [
    { id: 'all', name: t('classSelection.allFilter') || 'Tümü', icon: 'grid-outline', color: colors.primary },
    { id: 'today', name: t('classSelection.todayFilter') || 'Bugün', icon: 'today-outline', color: colors.success },
    { id: 'tomorrow', name: t('classSelection.tomorrowFilter') || 'Yarın', icon: 'calendar-outline', color: colors.warning },
    { id: 'available', name: t('classSelection.availableFilter') || 'Müsait', icon: 'checkmark-circle-outline', color: colors.info },
  ];

  const formatDisplayDate = (value) => {
    if (!value) return '';

    let date;

    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = value;
    } else if (value && typeof value === 'object' && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else if (value && typeof value === 'object' && typeof value.toDate === 'function') {
      date = value.toDate();
    } else {
      return '';
    }

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const options = { day: 'numeric', month: 'long', weekday: 'long' };
    const locale = currentLanguage === 'tr' ? 'tr-TR' : 'en-US';

    try {
      return date.toLocaleDateString(locale, options);
    } catch (error) {
      try {
        return date.toLocaleDateString('tr-TR', options);
      } catch (fallbackError) {
        return date.toDateString();
      }
    }
  };


  useEffect(() => {
    loadLessons();
  }, []);

  useEffect(() => {
    filterLessons();
  }, [groupedLessons, searchQuery, selectedFilter]);

  // Re-format dates when language changes
  useEffect(() => {
    if (lessons.length > 0) {
      const lessonsWithFormattedDates = lessons.map(lesson => ({
        ...lesson,
        formattedDate: formatDisplayDate(lesson.originalDate || lesson.scheduledDate),
      }));
      setLessons(lessonsWithFormattedDates);
    }
    
    if (groupedLessons.length > 0) {
      const groupedWithFormattedDates = groupedLessons.map(group => ({
        ...group,
        formattedDate: formatDisplayDate(group.originalDate || group.date),
        lessons: (group.lessons || []).map(lesson => ({
          ...lesson,
          formattedDate: formatDisplayDate(lesson.originalDate || lesson.scheduledDate),
        })),
      }));
      setGroupedLessons(groupedWithFormattedDates);
    }
  }, [currentLanguage]);

  const loadLessons = async () => {
    try {
      const result = await lessonService.getAllLessons();
      if (result.success) {
        console.log('✅ Lessons loaded:', {
          lessons: result.lessons.length,
          trainers: result.trainers?.length || 0,
          lessonTypes: result.lessonTypes?.length || 0
        });
        
        const lessonsWithFormattedDates = (result.lessons || []).map(lesson => ({
          ...lesson,
          originalDate: lesson.formattedDate || lesson.scheduledDate, // Store original date
          formattedDate: formatDisplayDate(lesson.formattedDate || lesson.scheduledDate),
        }));

        const groupedWithFormattedDates = (result.groupedLessons || []).map(group => ({
          ...group,
          originalDate: group.formattedDate || group.date, // Store original date
          formattedDate: formatDisplayDate(group.formattedDate || group.date),
          lessons: (group.lessons || []).map(lesson => ({
            ...lesson,
            originalDate: lesson.formattedDate || lesson.scheduledDate, // Store original date
            formattedDate: formatDisplayDate(lesson.formattedDate || lesson.scheduledDate),
          })),
        }));

        setLessons(lessonsWithFormattedDates);
        setGroupedLessons(groupedWithFormattedDates);

        // Set trainers and lesson types from Firebase
        if (result.trainers) {
          setTrainers(result.trainers);
        }
        
        if (result.lessonTypes) {
          setLessonTypes(result.lessonTypes);
        }
      } else {
        Alert.alert(t('general.error') || 'Hata', result.message);
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
      Alert.alert(t('general.error') || 'Hata', t('classSelection.loadingError') || 'Dersler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  };

  const filterLessons = () => {
    let filteredGroups = groupedLessons.map(group => {
      let filteredLessonsInGroup = group.lessons;

      // Filter by search query (search in title and instructor name)
      if (searchQuery.trim()) {
        filteredLessonsInGroup = filteredLessonsInGroup.filter(lesson =>
          lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lesson.instructor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lesson.type?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Filter by selected filter
      if (selectedFilter !== 'all') {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        filteredLessonsInGroup = filteredLessonsInGroup.filter(lesson => {
          switch (selectedFilter) {
            case 'today':
              return new Date(lesson.scheduledDate).toDateString() === today.toDateString();
            case 'tomorrow':
              return new Date(lesson.scheduledDate).toDateString() === tomorrow.toDateString();
            case 'available':
              return lesson.currentParticipants < lesson.maxParticipants;
            default:
              return true;
          }
        });
      }

      return {
        ...group,
        lessons: filteredLessonsInGroup
      };
    });

    // Remove empty groups
    filteredGroups = filteredGroups.filter(group => group.lessons.length > 0);

    setFilteredGroupedLessons(filteredGroups);
  };

  // Helper functions for mock data
  const handleBookClass = async (lesson) => {
    if (!user) {
      Alert.alert(t('general.error') || 'Hata', t('classSelection.loginRequired') || 'Rezervasyon yapmak için giriş yapmanız gerekiyor.');
      return;
    }

    // Check if lesson is too close to start (within 1 hour)
    const now = new Date();
    const lessonDateTime = new Date(lesson.scheduledDate);
    const timeUntilLesson = lessonDateTime.getTime() - now.getTime();
    const oneHourInMs = 60 * 60 * 1000;
    
    if (timeUntilLesson <= oneHourInMs && timeUntilLesson > 0) {
      Alert.alert(
        t('classSelection.tooLateTitle') || 'Rezervasyon Çok Geç', 
        t('classSelection.tooLateMessage') || 'Bu ders başlamadan 1 saat öncesine kadar rezerve edilebilir.'
      );
      return;
    }

    Alert.alert(
      t('classSelection.bookingConfirmTitle') || 'Ders Rezervasyonu',
      `${lesson.title} ${t('classSelection.bookingConfirmMessage') || 'dersini rezerve etmek istediğinizden emin misiniz?'}\n\n${t('classSelection.instructor') || 'Eğitmen'}: ${lesson.instructor}\n${t('classSelection.time') || 'Zaman'}: ${lesson.formattedTime}\n${t('classSelection.date') || 'Tarih'}: ${lesson.formattedDate}\n${t('classSelection.duration') || 'Süre'}: ${lesson.duration} ${t('classSelection.minutes') || 'dakika'}`,
      [
        { text: t('general.cancel') || 'İptal', style: 'cancel' },
        { 
          text: t('classSelection.bookButton') || 'Rezerve Et', 
          onPress: async () => {
            const result = await lessonService.bookLesson(lesson.id, user.uid);
            if (result.success) {
              Alert.alert(
                t('classSelection.bookingSuccess') || 'Başarılı! 🎉', 
                result.messageKey ? t(result.messageKey) : result.message
              );
              loadLessons(); // Refresh the lessons
            } else {
              Alert.alert(
                t('general.error') || 'Hata', 
                result.messageKey ? t(result.messageKey) : result.message
              );
            }
          }
        }
      ]
    );
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
      case 'başlangıç':
        return colors.success;
      case 'intermediate':
      case 'orta':
        return colors.warning;
      case 'advanced':
      case 'ileri':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getLevelText = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner': 
      case 'başlangıç': 
        return t('classSelection.beginner') || 'Başlangıç';
      case 'intermediate': 
      case 'orta': 
        return t('classSelection.intermediate') || 'Orta';
      case 'advanced': 
      case 'ileri': 
      case 'İleri': 
        return t('classSelection.advanced') || 'İleri';
      default: 
        return t('classSelection.general') || level || 'Genel';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <UniqueHeader 
          title={t('classSelection.title') || "Yoga Dersleri"} 
          subtitle={t('classSelection.loadingLessons') || "Dersler yükleniyor..."} 
          rightIcon="refresh"
          onRightPress={loadLessons}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('classSelection.loadingLessons') || "Dersler yükleniyor..."}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniqueHeader 
        title={t('classSelection.title') || "Yoga Dersleri"} 
        subtitle={t('classSelection.subtitle') || "Katılmak istediğiniz dersi seçin"}
        showNotification={false}
      >
      </UniqueHeader>

      <Animated.ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
          {/* Remove the old pageHeader since we now have ModernHeader */}

          {/* Enhanced Search Bar */}
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={[colors.white, colors.white + 'F8']}
              style={styles.searchWrapper}
            >
              <View style={styles.searchInputContainer}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('classSelection.searchPlaceholder') || "Ders veya eğitmen ara..."}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={colors.textSecondary}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Modern Filter Pills */}
          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              <View style={styles.filtersContainer}>
                {filterOptions.map((filter) => (
                  <TouchableOpacity 
                    key={filter.id} 
                    style={[
                      styles.filterPill,
                      selectedFilter === filter.id && [styles.filterPillSelected, { backgroundColor: filter.color }]
                    ]}
                    onPress={() => setSelectedFilter(filter.id)}
                  >
                    <Ionicons 
                      name={filter.icon} 
                      size={16} 
                      color={selectedFilter === filter.id ? colors.white : filter.color} 
                      style={styles.filterIcon}
                    />
                    <Text style={[
                      styles.filterText,
                      selectedFilter === filter.id && styles.filterTextSelected
                    ]}>
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Available Classes with Enhanced Design */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderModern}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>{t('classSelection.availableClasses') || 'Mevcut Dersler'}</Text>
              </View>
              <View style={styles.resultsCountBadge}>
                <Text style={styles.resultsCount}>
                  {filteredGroupedLessons.reduce((total, group) => total + group.lessons.length, 0)}
                </Text>
              </View>
            </View>
            
            {filteredGroupedLessons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>{t('classSelection.noLessonsFound') || 'Ders bulunamadı'}</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? (t('classSelection.noLessonsDescription') || 'Arama kriterlerinize uygun ders bulunmuyor.') : (t('classSelection.noActiveLessons') || 'Henüz aktif ders bulunmuyor.')}
                </Text>
              </View>
            ) : (
              filteredGroupedLessons.map((dateGroup, groupIndex) => (
                <Animated.View 
                  key={dateGroup.date} 
                  style={[
                    styles.dateGroup,
                    {
                      opacity: scrollY.interpolate({
                        inputRange: [0, 100 * (groupIndex + 1)],
                        outputRange: [1, 0.95],
                        extrapolate: 'clamp',
                      })
                    }
                  ]}
                >
                  {/* Enhanced Date Header */}
                  <LinearGradient
                    colors={[colors.primary + '08', colors.primary + '05']}
                    style={styles.dateHeader}
                  >
                    <View style={styles.dateHeaderLeft}>
                      <Ionicons name="time-outline" size={18} color={colors.primary} />
                      <Text style={styles.dateTitle}>{dateGroup.formattedDate}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>
                        {dateGroup.lessons.length} {t('classSelection.lessons') || 'ders'}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Enhanced Class Cards */}
                  {dateGroup.lessons.map((lesson, lessonIndex) => {
                    const categoryInfo = lesson.lessonTypeInfo || getCategoryInfo(lesson.title);
                    const isFullyBooked = lesson.currentParticipants >= lesson.maxParticipants;
                    const isUserBooked = lesson.participants && lesson.participants.includes(user?.uid);
                    
                    // Check if lesson is too close to start (within 1 hour)
                    const now = new Date();
                    const lessonDateTime = new Date(lesson.scheduledDate);
                    const timeUntilLesson = lessonDateTime.getTime() - now.getTime();
                    const oneHourInMs = 60 * 60 * 1000;
                    const isTooLateToBook = timeUntilLesson <= oneHourInMs && timeUntilLesson > 0;
                    
                    const capacityPercentage = (lesson.currentParticipants / lesson.maxParticipants) * 100;
                    
                    return (
                      <Animated.View 
                        key={lesson.id}
                        style={[
                          styles.classCard,
                          isFullyBooked && styles.classCardDisabled,
                          {
                            transform: [{
                              scale: scrollY.interpolate({
                                inputRange: [100 * lessonIndex, 100 * (lessonIndex + 1)],
                                outputRange: [1, 0.98],
                                extrapolate: 'clamp',
                              })
                            }]
                          }
                        ]}
                      >
                        <LinearGradient
                          colors={isFullyBooked ? [colors.gray, colors.lightGray] : [colors.white, colors.white + 'F8']}
                          style={styles.cardGradient}
                        >
                          {/* Enhanced Header with Trainer Info */}
                          <View style={styles.classHeader}>
                            <View style={styles.classMainInfo}>
                              <View style={styles.classTitleRow}>
                                <View style={[
                                  styles.categoryIconSmall, 
                                  { backgroundColor: (categoryInfo.color || colors.primary) + '15' }
                                ]}>
                                  <Ionicons 
                                    name={categoryInfo.icon || 'fitness-outline'} 
                                    size={16} 
                                    color={categoryInfo.color || colors.primary} 
                                  />
                                </View>
                                <View style={styles.classNameContainer}>
                                  <Text style={styles.className}>{lesson.title}</Text>
                                </View>
                              </View>
                              
                              {/* Trainer Information */}
                              <View style={styles.trainerInfo}>
                                <View style={styles.trainerAvatar}>
                                  <Ionicons name="person" size={16} color={colors.primary} />
                                </View>
                                <View style={styles.trainerDetails}>
                                  <Text style={styles.trainerName}>🧘‍♀️ {lesson.instructor}</Text>
                                  <Text style={styles.trainerTitle}>
                                    {lesson.trainerSpecializations?.length > 0 
                                      ? lesson.trainerSpecializations[0] 
                                      : ''
                                    }
                                  </Text>
                                  {lesson.trainerActive === false && (
                                    <Text style={[styles.trainerTitle, { color: colors.warning }]}>
                                      ⚠️ Pasif Eğitmen
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                            
                            {isFullyBooked ? (
                              <View style={styles.fullBadge}>
                                <Text style={styles.fullBadgeText}>{t('classSelection.fullBadge') || 'DOLU'}</Text>
                              </View>
                            ) : (
                              <View style={[styles.availableBadge, { backgroundColor: colors.success + '15' }]}>
                                <Text style={[styles.availableBadgeText, { color: colors.success }]}>{t('classSelection.availableBadge') || 'MÜSAİT'}</Text>
                              </View>
                            )}
                          </View>

                          {/* Enhanced Class Details */}
                          <View style={styles.classDetails}>
                            <View style={styles.detailsRow}>
                              <View style={styles.detailItem}>
                                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.detailText}>{lesson.formattedTime}</Text>
                                <View style={styles.durationBadge}>
                                  <Text style={styles.durationText}>
                                    {lesson.duration}{t('classSelection.minutesShort') || 'dk'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            
                            <View style={styles.detailsRow}>
                              <View style={styles.detailItem}>
                                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                                <Text style={styles.detailText}>
                                  {lesson.currentParticipants}/{lesson.maxParticipants} {t('classSelection.people') || 'kişi'}
                                </Text>
                                <View style={styles.capacityBarContainer}>
                                  <View style={styles.capacityBar}>
                                    <Animated.View 
                                      style={[
                                        styles.capacityFill,
                                        { 
                                          width: `${capacityPercentage}%`,
                                          backgroundColor: isFullyBooked ? colors.error : 
                                            capacityPercentage > 80 ? colors.warning : colors.success
                                        }
                                      ]}
                                    />
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Enhanced Footer */}
                          <View style={styles.classFooter}>
                            <View style={styles.leftFooter}>
                              {/* Lesson Type Badge */}
                              <View style={[
                                styles.levelBadge, 
                                { backgroundColor: '#38a169' + '15', marginRight: 8 }
                              ]}>
                                <Text style={[
                                  styles.levelText, 
                                  { color: '#38a169' }
                                ]}>
                                  {lesson.type || lesson.lessonTypeInfo?.name || t('classSelection.general') || 'Genel'}
                                </Text>
                              </View>
                              
                              {/* Status Level Badge */}
                              <View style={[
                                styles.levelBadge, 
                                { backgroundColor: (lesson.statusColor || '#F59E0B') + '15' }
                              ]}>
                                <Text style={[
                                  styles.levelText, 
                                  { color: lesson.statusColor || '#F59E0B' }
                                ]}>
                                  {getLevelText(lesson.statusLevel || lesson.statusInfo?.name) || t('classSelection.intermediate') || 'Orta'}
                                </Text>
                              </View>
                            </View>
                            
                            <TouchableOpacity 
                              style={[
                                styles.bookButton,
                                (isFullyBooked || isUserBooked || isTooLateToBook) && styles.bookButtonDisabled
                              ]}
                              onPress={() => handleBookClass(lesson)}
                              disabled={isFullyBooked || isUserBooked || isTooLateToBook}
                            >
                              <LinearGradient
                                colors={isFullyBooked ? 
                                  [colors.lightGray, colors.gray] : 
                                  isTooLateToBook ?
                                  [colors.warning, colors.warningDark || colors.warning + 'DD'] :
                                  isUserBooked ?
                                  [colors.success, colors.success + 'DD'] :
                                  [colors.primary, colors.primaryDark]
                                }
                                style={styles.bookButtonGradient}
                              >
                                <Ionicons 
                                  name={isFullyBooked ? "close-circle-outline" : 
                                       isTooLateToBook ? "time-outline" :
                                       isUserBooked ? "checkmark-circle-outline" : 
                                       "add-circle-outline"} 
                                  size={18} 
                                  color={(isFullyBooked || isTooLateToBook) ? colors.textSecondary : colors.white} 
                                />
                                <Text style={[
                                  styles.bookButtonText,
                                  (isFullyBooked || isTooLateToBook) && styles.bookButtonTextDisabled
                                ]}>
                                  {isFullyBooked ? 
                                    (t('classSelection.fullButton') || 'Dolu') : 
                                    isTooLateToBook ?
                                    (t('classSelection.tooLateButton') || 'Çok Geç') :
                                    isUserBooked ?
                                    (t('classSelection.bookedButton') || 'Rezerve Edildi') :
                                    (t('classSelection.bookButton') || 'Rezerve Et')
                                  }
                                </Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    );
                  })}
                </Animated.View>
              ))
            )}
          </View>

          {/* Enhanced Info Card */}
          <View style={styles.section}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={styles.infoHeaderTitle}>{t('classSelection.infoTitle') || 'Booking Guide'}</Text>
            </View>
            
            <View style={styles.infoCardsContainer}>
              {/* Cancel Policy Card */}
              <LinearGradient
                colors={[colors.warning + '12', colors.warning + '08']}
                style={styles.infoItemCard}
              >
                <View style={styles.infoItemIconContainer}>
                  <Ionicons name="time-outline" size={22} color={colors.warning} />
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>{t('classSelection.infoBulletTitle1') || 'Cancellation Policy'}</Text>
                  <Text style={styles.infoItemText}>
                    {t('classSelection.infoBullet1') || 'Lessons can be cancelled up to 2 hours before start time'}
                  </Text>
                </View>
              </LinearGradient>

              {/* Arrival Time Card */}
              <LinearGradient
                colors={[colors.primary + '12', colors.primary + '08']}
                style={styles.infoItemCard}
              >
                <View style={styles.infoItemIconContainer}>
                  <Ionicons name="alarm-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>{t('classSelection.infoBulletTitle2') || 'First Visit'}</Text>
                  <Text style={styles.infoItemText}>
                    {t('classSelection.infoBullet2') || 'First-time participants should arrive 15 minutes early'}
                  </Text>
                </View>
              </LinearGradient>

              {/* Equipment Card */}
              <LinearGradient
                colors={[colors.success + '12', colors.success + '08']}
                style={styles.infoItemCard}
              >
                <View style={styles.infoItemIconContainer}>
                  <Ionicons name="fitness-outline" size={22} color={colors.success} />
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>{t('classSelection.infoBulletTitle3') || 'Equipment'}</Text>
                  <Text style={styles.infoItemText}>
                    {t('classSelection.infoBullet3') || 'All required equipment is provided in class'}
                  </Text>
                </View>
              </LinearGradient>

              {/* Clothing Card */}
              <LinearGradient
                colors={[colors.secondary + '12', colors.secondary + '08']}
                style={styles.infoItemCard}
              >
                <View style={styles.infoItemIconContainer}>
                  <Ionicons name="shirt-outline" size={22} color={colors.secondary} />
                </View>
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>{t('classSelection.infoBulletTitle4') || 'Dress Code'}</Text>
                  <Text style={styles.infoItemText}>
                    {t('classSelection.infoBullet4') || 'Remember to wear comfortable clothing'}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Bottom spacing for navigation */}
          <View style={{ height: 120 }} />
        </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  
  // Modern Header Styles
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Enhanced Search Styles
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  searchWrapper: {
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },

  // Filter Pills Styles
  section: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filtersScroll: {
    marginHorizontal: -24,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillSelected: {
    borderColor: 'transparent',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  filterTextSelected: {
    color: colors.white,
  },

  // Modern Section Headers
  sectionHeaderModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  resultsCountBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Enhanced Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },

  // Enhanced Date Group
  dateGroup: {
    marginBottom: 28,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  dateBadge: {
    backgroundColor: colors.white + 'CC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Enhanced Class Cards
  classCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  classCardDisabled: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: 20,
    borderRadius: 20,
  },

  // Enhanced Class Header
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  classMainInfo: {
    flex: 1,
  },
  classTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classNameContainer: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  trainingType: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Trainer Information
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trainerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  trainerTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Status Badges
  fullBadge: {
    backgroundColor: colors.error + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 0.5,
  },
  availableBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  availableBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Enhanced Class Details
  classDetails: {
    marginBottom: 16,
  },
  detailsRow: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  durationBadge: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },

  // Enhanced Capacity Bar
  capacityBarContainer: {
    marginLeft: 8,
  },
  capacityBar: {
    width: 60,
    height: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 3,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Extra Info
  extraInfo: {
    marginTop: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  infoChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  benefitChip: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  benefitText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },

  // Enhanced Footer
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recurringText: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },

  // Enhanced Book Button
  bookButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    justifyContent: 'center',
  },
  bookButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // Enhanced Info Section
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  infoCardsContainer: {
    gap: 12,
  },
  infoItemCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  infoItemIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItemContent: {
    flex: 1,
    paddingTop: 2,
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  infoItemText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500',
  },
});
