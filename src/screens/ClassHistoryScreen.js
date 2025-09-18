import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { userLessonService } from '../services/userLessonService';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import UniqueHeader from '../components/UniqueHeader';
import { translateLessonsArray } from '../utils/lessonTranslation';

// Helper function to safely translate lesson types
const translateLessonType = (t, lessonTitle) => {
  if (!lessonTitle) return '';
  const translationKey = `lessonTypes.${lessonTitle}`;
  const translated = t(translationKey);
  return translated === translationKey ? lessonTitle : translated;
};

// Helper function to safely translate lesson descriptions
const translateLessonDescription = (t, description) => {
  if (!description) return '';
  const translationKey = `lessonDescriptions.${description}`;
  const translated = t(translationKey);
  return translated === translationKey ? description : translated;
};

export default function ClassHistoryScreen() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [selectedTab, setSelectedTab] = useState('upcoming'); // upcoming, completed, cancelled
  const [lessons, setLessons] = useState({
    all: [],
    completed: [],
    upcoming: [],
    cancelled: []
  });
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedCount: 0,
    upcomingCount: 0,
    cancelledCount: 0,
    thisWeekCount: 0,
    thisMonthCount: 0,
    favoriteType: null,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserLessons();
    }
  }, [user]);

  // Reload lessons when locale changes to retranslate content
  useEffect(() => {
    if (user && lessons.all.length > 0) {
      loadUserLessons();
    }
  }, [locale]);

  const loadUserLessons = async () => {
    try {
      setLoading(true);
      
      // Get user lessons and stats in parallel
      const [lessonsResult, statsResult] = await Promise.all([
        userLessonService.getUserLessons(user.uid),
        userLessonService.getUserLessonStats(user.uid)
      ]);
      
      if (lessonsResult.success) {
        // Translate lesson data based on current locale
        const translatedLessons = {
          ...lessonsResult.lessons,
          all: lessonsResult.lessons.all?.map(lesson => ({
            ...lesson,
            title: translateLessonType(t, lesson.title),
            type: lesson.type ? translateLessonType(t, lesson.type) : lesson.type,
            trainingType: lesson.trainingType ? translateLessonType(t, lesson.trainingType) : lesson.trainingType,
            description: translateLessonDescription(t, lesson.description),
          })) || [],
          completed: lessonsResult.lessons.completed?.map(lesson => ({
            ...lesson,
            title: translateLessonType(t, lesson.title),
            type: lesson.type ? translateLessonType(t, lesson.type) : lesson.type,
            trainingType: lesson.trainingType ? translateLessonType(t, lesson.trainingType) : lesson.trainingType,
            description: translateLessonDescription(t, lesson.description),
          })) || [],
          upcoming: lessonsResult.lessons.upcoming?.map(lesson => ({
            ...lesson,
            title: translateLessonType(t, lesson.title),
            type: lesson.type ? translateLessonType(t, lesson.type) : lesson.type,
            trainingType: lesson.trainingType ? translateLessonType(t, lesson.trainingType) : lesson.trainingType,
            description: translateLessonDescription(t, lesson.description),
          })) || [],
          cancelled: lessonsResult.lessons.cancelled?.map(lesson => ({
            ...lesson,
            title: translateLessonType(t, lesson.title),
            type: lesson.type ? translateLessonType(t, lesson.type) : lesson.type,
            trainingType: lesson.trainingType ? translateLessonType(t, lesson.trainingType) : lesson.trainingType,
            description: translateLessonDescription(t, lesson.description),
          })) || [],
        };
        
        setLessons(translatedLessons);
      } else {
        Alert.alert(t('error') || 'Error', lessonsResult.message || 'An error occurred while loading lessons.');
      }
      
      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading user lessons:', error);
      Alert.alert('Hata', 'Dersleriniz yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserLessons();
    setRefreshing(false);
  };

  const tabs = [
    { id: 'upcoming', name: t('classes.upcoming'), count: stats.upcomingCount },
    { id: 'completed', name: t('classes.completed'), count: stats.completedCount },
    { id: 'cancelled', name: t('classes.cancelled'), count: stats.cancelledCount },
  ];

  const getCurrentClasses = () => {
    switch (selectedTab) {
      case 'completed': return lessons.completed;
      case 'upcoming': return lessons.upcoming;
      case 'cancelled': return lessons.cancelled;
      default: return lessons.upcoming;
    }
  };

  const handleCancelClass = (lesson) => {
    // First check if lesson can be cancelled based on time
    let timeCheckMessage = '';
    try {
      let lessonDateTime;
      
      if (lesson.scheduledDate.includes('T')) {
        const dateOnly = lesson.scheduledDate.split('T')[0];
        lessonDateTime = new Date(`${dateOnly}T${lesson.startTime}:00`);
      } else {
        lessonDateTime = new Date(`${lesson.scheduledDate}T${lesson.startTime}:00`);
      }
      
      const now = new Date();
      const timeDiff = lessonDateTime.getTime() - now.getTime();
      const hoursUntilLesson = timeDiff / (1000 * 60 * 60);
      
      if (hoursUntilLesson < 2) {
        timeCheckMessage = `\n⚠️ ${t('classes.cancelNote')} (${Math.max(0, hoursUntilLesson).toFixed(1)} ${t('time.hoursLeft')})`;
      }
    } catch (error) {
      console.warn('Time check failed:', error);
    }

    Alert.alert(
      t('classes.cancelLessonTitle'),
      `${lesson.title} ${t('classes.cancelConfirm')}\n\n${t('time.date')}: ${lesson.formattedDate}\n${t('time.time')}: ${lesson.formattedTime}${timeCheckMessage}\n\n❗ ${t('classes.cancelWarning')}`,
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('classes.cancel'), 
          style: 'destructive',
          onPress: async () => {
            const result = await userLessonService.cancelLessonBooking(lesson.id, user.uid);
            if (result.success) {
              Alert.alert(t('success') + '! ✅', result.message);
              loadUserLessons(); // Refresh the lessons
            } else {
              Alert.alert(t('error'), result.message);
            }
          }
        }
      ]
    );
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={16}
        color={index < rating ? '#FFD700' : colors.gray}
      />
    ));
  };

  const getCategoryIcon = (typeInfo) => {
    return typeInfo?.icon || 'fitness-outline';
  };

  const getCategoryColor = (typeInfo) => {
    return typeInfo?.color || colors.primary;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'upcoming': return colors.primary;
      case 'cancelled': return colors.error;
      default: return colors.gray;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return t('classes.completed');
      case 'upcoming': return t('classes.upcoming');
      case 'cancelled': return t('classes.cancelled');
      default: return '';
    }
  };

  const canCancelLesson = (lesson) => {
    if (lesson.userStatus !== 'upcoming') return false;
    
    try {
      let lessonDateTime;
      
      // Handle different date formats
      if (lesson.scheduledDate.includes('T')) {
        const dateOnly = lesson.scheduledDate.split('T')[0];
        lessonDateTime = new Date(`${dateOnly}T${lesson.startTime}:00`);
      } else {
        lessonDateTime = new Date(`${lesson.scheduledDate}T${lesson.startTime}:00`);
      }
      
      const now = new Date();
      const timeDiff = lessonDateTime.getTime() - now.getTime();
      const hoursUntilLesson = timeDiff / (1000 * 60 * 60);
      
      
      return hoursUntilLesson >= 2; // Can cancel if more than 2 hours away
    } catch (error) {
      console.warn('Error checking cancel eligibility:', error);
      return true; // Allow cancellation if we can't check time properly
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <UniqueHeader
        title={t('classes.title')} 
        subtitle={t('classes.subtitle')}
        rightIcon="refresh-outline"
        onRightPress={onRefresh}
      />
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

          {/* Enhanced Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.upcomingCount}</Text>
              <Text style={styles.statLabel}>{t('classes.upcoming')}</Text>
              <Ionicons name="calendar" size={24} color={colors.primary} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completedCount}</Text>
              <Text style={styles.statLabel}>{t('classes.completed')}</Text>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalLessons}</Text>
              <Text style={styles.statLabel}>{t('profile.totalLessons')}</Text>
              <Ionicons name="trophy" size={24} color={colors.warning} />
            </View>
          </View>

          {/* Additional Stats Row */}
          {stats.totalLessons > 0 && (
            <View style={styles.additionalStats}>
              <View style={styles.additionalStatCard}>
                <View style={styles.statRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.additionalStatLabel}>{t('profile.thisMonth')}</Text>
                </View>
                <Text style={styles.additionalStatNumber}>{stats.thisMonthCount} {t('classes.lessons')}</Text>
              </View>
              
              <View style={styles.additionalStatCard}>
                <View style={styles.statRow}>
                  <Ionicons name="trending-up-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.additionalStatLabel}>{t('profile.completionRate')}</Text>
                </View>
                <Text style={styles.additionalStatNumber}>%{stats.completionRate}</Text>
              </View>

              <View style={styles.additionalStatCard}>
                <View style={styles.statRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.additionalStatLabel}>{t('profile.thisWeek')}</Text>
                </View>
                <Text style={styles.additionalStatNumber}>{stats.thisWeekCount} {t('classes.lessons')}</Text>
              </View>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  selectedTab === tab.id && styles.activeTab
                ]}
                onPress={() => setSelectedTab(tab.id)}
              >
                <Text style={[
                  styles.tabText,
                  selectedTab === tab.id && styles.activeTabText
                ]}>
                  {tab.name}
                </Text>
                <View style={[
                  styles.tabBadge,
                  selectedTab === tab.id && styles.activeTabBadge
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    selectedTab === tab.id && styles.activeTabBadgeText
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Classes List */}
          <View style={styles.section}>
            {getCurrentClasses().length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color={colors.gray} />
                <Text style={styles.emptyStateTitle}>{t('classes.noLessons')}</Text>
                <Text style={styles.emptyStateText}>
                  {selectedTab === 'completed' && t('classes.noCompleted')}
                  {selectedTab === 'upcoming' && t('classes.noUpcoming')}
                  {selectedTab === 'cancelled' && t('classes.noCancelled')}
                </Text>
              </View>
            ) : (
              getCurrentClasses().map((lesson) => (
                <View key={lesson.id} style={styles.classCard}>
                  <View style={styles.classHeader}>
                    <View style={styles.classMainInfo}>
                      <View style={styles.classTitleRow}>
                        <View style={[
                          styles.categoryIcon,
                          { backgroundColor: getCategoryColor(lesson.typeInfo) + '15' }
                        ]}>
                          <Ionicons
                            name={getCategoryIcon(lesson.typeInfo)}
                            size={20}
                            color={getCategoryColor(lesson.typeInfo)}
                          />
                        </View>
                        <View style={styles.classTextInfo}>
                          <Text style={styles.className}>{lesson.title}</Text>
                          <Text style={styles.instructorName}>
                            🧘‍♀️ {lesson.trainerName || lesson.instructor || t('ui.noInstructor')}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(lesson.userStatus) + '15' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(lesson.userStatus) }
                      ]}>
                        {getStatusText(lesson.userStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.classDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{lesson.formattedDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{lesson.formattedTime}</Text>
                    </View>
                    {lesson.duration && (
                      <View style={styles.detailRow}>
                        <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{lesson.duration} {t('classes.duration')}</Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>
                        {lesson.currentParticipants}/{lesson.maxParticipants} {t('classes.participants')}
                      </Text>
                    </View>
                    {lesson.reason && (
                      <View style={styles.detailRow}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.error} />
                        <Text style={[styles.detailText, { color: colors.error }]}>{lesson.reason}</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Area */}
                  <View style={styles.classFooter}>
                    {/* Lesson Type Badge */}
                    <View style={styles.leftFooter}>
                      <View style={[
                        styles.typeBadge, 
                        { backgroundColor: getCategoryColor(lesson.typeInfo) + '15' }
                      ]}>
                        <Text style={[
                          styles.typeBadgeText, 
                          { color: getCategoryColor(lesson.typeInfo) }
                        ]}>
                          {lesson.typeInfo?.category || lesson.type || t('classes.general')}
                        </Text>
                      </View>
                    </View>
                    
                    {lesson.userStatus === 'upcoming' && (
                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          !canCancelLesson(lesson) && styles.cancelButtonWarning
                        ]}
                        onPress={() => handleCancelClass(lesson)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color={
                          canCancelLesson(lesson) ? colors.error : colors.warning
                        } />
                        <Text style={[
                          styles.cancelButtonText,
                          !canCancelLesson(lesson) && styles.cancelButtonWarningText
                        ]}>
                          {canCancelLesson(lesson) ? t('classes.cancel') : t('classes.cancel') + '*'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>
    </SafeAreaView>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  additionalStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  additionalStatCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 2,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  additionalStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  additionalStatNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  activeTabText: {
    color: colors.white,
  },
  tabBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
  },
  activeTabBadge: {
    backgroundColor: colors.white + '30',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  activeTabBadgeText: {
    color: colors.white,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  classCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
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
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  classTextInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  instructorName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  classDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftFooter: {
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.error + '15',
    borderRadius: 12,
  },
  cancelButtonWarning: {
    backgroundColor: colors.warning + '15',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButtonWarningText: {
    color: colors.warning,
  },
  noCancelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  noCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});
