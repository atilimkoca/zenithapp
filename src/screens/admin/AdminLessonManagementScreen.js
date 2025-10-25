import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { adminLessonService as lessonService } from '../../services/lessonService';
import UniqueHeader from '../../components/UniqueHeader';
import DateCarouselPicker from '../../components/DateCarouselPicker';

const formatDateKey = (value) => {
  if (!value) return null;

  let dateInstance = null;

  if (typeof value === 'string') {
    dateInstance = new Date(value);
  } else if (value instanceof Date) {
    dateInstance = value;
  } else if (value?.seconds) {
    dateInstance = new Date(value.seconds * 1000);
  } else if (typeof value?.toDate === 'function') {
    dateInstance = value.toDate();
  }

  if (!dateInstance || Number.isNaN(dateInstance.getTime())) {
    return null;
  }

  const year = dateInstance.getFullYear();
  const month = `${dateInstance.getMonth() + 1}`.padStart(2, '0');
  const day = `${dateInstance.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default function AdminLessonManagementScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantDetails, setParticipantDetails] = useState({});
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes down
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If dragged down more than 100px, close the modal
        if (gestureState.dy > 100) {
          Animated.timing(panY, {
            toValue: 500,
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            closeLessonDetails();
            panY.setValue(0);
          });
        } else {
          // Otherwise, spring back to original position
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    loadLessons();
  }, []);

  useEffect(() => {
    filterLessons();
  }, [lessons, searchTerm, filterStatus, selectedDateKey]);

  const availableDateKeys = useMemo(() => {
    const uniqueKeys = new Set();
    lessons.forEach(lesson => {
      const key = formatDateKey(lesson.scheduledDate);
      if (key) {
        uniqueKeys.add(key);
      }
    });
    return Array.from(uniqueKeys).sort();
  }, [lessons]);

  useEffect(() => {
    if (!availableDateKeys.length) {
      if (selectedDateKey !== null) {
        setSelectedDateKey(null);
      }
      return;
    }

    if (selectedDateKey && !availableDateKeys.includes(selectedDateKey)) {
      setSelectedDateKey(availableDateKeys[0]);
    }
  }, [availableDateKeys, selectedDateKey]);

  // Reload lessons when screen comes back into focus (after editing/creating)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLessons();
    });

    return unsubscribe;
  }, [navigation]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const result = await lessonService.getAllLessons();
      
      if (result.success) {
        setLessons(result.lessons);
      } else {
        Alert.alert('Hata', result.message || 'Dersler yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
      Alert.alert('Hata', 'Dersler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filterLessons = () => {
    let filtered = lessons.filter(lesson => {
      const matchesSearch = 
        lesson.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.type?.toLowerCase().includes(searchTerm.toLowerCase());

      const lessonDate = new Date(lesson.scheduledDate);
      const now = new Date();
      const isPast = lessonDate < now;

      let matchesStatus = true;
      if (filterStatus === 'upcoming') {
        // Only show future lessons that are not cancelled
        matchesStatus = lessonDate > now && lesson.status !== 'cancelled';
      } else if (filterStatus === 'completed') {
        // Show all past lessons (completed, scheduled, or no status) but not cancelled
        matchesStatus = isPast && lesson.status !== 'cancelled';
      } else if (filterStatus === 'cancelled') {
        // Show only cancelled lessons
        matchesStatus = lesson.status === 'cancelled';
      }

      const lessonDateKey = formatDateKey(lesson.scheduledDate);
      const matchesDate = !selectedDateKey || lessonDateKey === selectedDateKey;

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Sort lessons by date - nearest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduledDate);
      const dateB = new Date(b.scheduledDate);
      const now = new Date();
      
      if (filterStatus === 'upcoming') {
        // For upcoming lessons: earliest first (ascending order)
        return dateA - dateB;
      } else if (filterStatus === 'completed') {
        // For past lessons: most recent first (descending order)
        return dateB - dateA;
      } else {
        // For cancelled: most recent first
        return dateB - dateA;
      }
    });

    setFilteredLessons(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  };

  const handleCancelLesson = async (lessonId, lessonTitle) => {
    Alert.alert(
      'Dersi İptal Et',
      `"${lessonTitle}" dersini iptal etmek istediğinizden emin misiniz?`,
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await lessonService.cancelLesson(lessonId, user.uid);
              
              if (result.success) {
                await loadLessons();
                Alert.alert('Başarılı', 'Ders başarıyla iptal edildi');
              } else {
                Alert.alert('Hata', result.message || 'Ders iptal edilemedi');
              }
            } catch (error) {
              console.error('Error cancelling lesson:', error);
              Alert.alert('Hata', 'Ders iptal edilirken hata oluştu');
            }
          }
        }
      ]
    );
  };

  const showLessonDetails = async (lesson) => {
    console.log('Opening lesson details:', lesson);
    setSelectedLesson(lesson);
    setShowDetailsModal(true);
    setParticipantDetails({});
    
    // Fetch participant details if lesson has participants
    const participantIds = lesson.participants || lesson.enrolledStudents || [];
    console.log('📋 Participant IDs:', participantIds);
    
    if (participantIds.length > 0) {
      setLoadingParticipants(true);
      await fetchParticipantDetails(participantIds);
      setLoadingParticipants(false);
    } else {
      setLoadingParticipants(false);
    }
  };

  const fetchParticipantDetails = async (participantIds) => {
    try {
      const details = {};
      
      for (const participantId of participantIds) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', participantId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('👤 Fetched user data:', { id: participantId, data: userData });
            const firstName = userData.firstName || userData.displayName?.split(' ')[0] || 'Adı';
            const lastName = userData.lastName || userData.displayName?.split(' ')[1] || 'Soyadı';
            
            details[participantId] = {
              name: `${firstName} ${lastName}`.trim(),
              email: userData.email || 'Email bilgisi yok',
              phone: userData.phone || 'Telefon bilgisi yok',
            };
          } else {
            console.log('⚠️ User document not found:', participantId);
            details[participantId] = {
              name: `ID: ${participantId.substring(0, 12)}...`,
              email: 'Üye bulunamadı',
              phone: '-',
            };
          }
        } catch (error) {
          console.error('Error fetching participant:', participantId, error);
          details[participantId] = {
            name: `Hata: ${participantId.substring(0, 8)}...`,
            email: 'Veri getirme hatası',
            phone: '-',
          };
        }
      }
      
      console.log('✅ All participant details fetched:', details);
      setParticipantDetails(details);
    } catch (error) {
      console.error('Error in fetchParticipantDetails:', error);
    }
  };

  const closeLessonDetails = () => {
    setShowDetailsModal(false);
    setSelectedLesson(null);
    setParticipantDetails({});
    setLoadingParticipants(false);
    panY.setValue(0);
  };

  const getStatusColor = (lesson) => {
    if (lesson.status === 'cancelled') return colors.error;
    if (lesson.status === 'completed') return colors.success;
    if (new Date(lesson.scheduledDate) < new Date()) return colors.warning;
    return colors.primary;
  };

  const getStatusText = (lesson) => {
    if (lesson.status === 'cancelled') return 'İptal Edildi';
    if (lesson.status === 'completed') return 'Tamamlandı';
    if (new Date(lesson.scheduledDate) < new Date()) return 'Geçmiş';
    return 'Yaklaşan';
  };

  const LessonCard = ({ lesson }) => (
    <TouchableOpacity 
      style={styles.lessonCard}
      onPress={() => showLessonDetails(lesson)}
    >
      <View style={styles.lessonHeader}>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonTrainer}>Eğitmen: {lesson.trainerName}</Text>
          <Text style={styles.lessonType}>{lesson.type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lesson) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(lesson) }]}>
            {getStatusText(lesson)}
          </Text>
        </View>
      </View>

      <View style={styles.lessonDetails}>
        <View style={styles.lessonDateTime}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.lessonDate}>
            {new Date(lesson.scheduledDate).toLocaleDateString('tr-TR')}
          </Text>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.lessonTime}>
            {lesson.startTime || new Date(lesson.scheduledDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {lesson.duration && (
            <>
              <Ionicons name="hourglass-outline" size={16} color={colors.textSecondary} style={{ marginLeft: 12 }} />
              <Text style={styles.lessonTime}>
                {lesson.duration} dk
              </Text>
            </>
          )}
        </View>

        <View style={styles.lessonCapacity}>
          <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.capacityText}>
            {lesson.currentParticipants || lesson.participants?.length || lesson.enrolledStudents?.length || 0} / {lesson.maxStudents || lesson.maxParticipants || 0} kişi
          </Text>
        </View>
      </View>

      {(() => {
        const lessonDate = new Date(lesson.scheduledDate);
        const now = new Date();
        const isPast = lessonDate < now;
        
        // Don't show buttons for past lessons or cancelled/completed lessons
        if (isPast || lesson.status === 'cancelled' || lesson.status === 'completed') {
          return null;
        }
        
        return (
          <View style={styles.lessonActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('EditLesson', { lesson });
              }}
            >
              <Ionicons name="create-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelLesson(lesson.id, lesson.title);
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>İptal Et</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
    </TouchableOpacity>
  );

  const FilterButton = ({ status, label }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterStatus === status && styles.activeFilterButton
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterButtonText,
        filterStatus === status && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <UniqueHeader
          title="Ders Yönetimi"
          subtitle="Tüm dersler"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Dersler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const upcomingCount = lessons.filter(l => new Date(l.scheduledDate) > new Date() && l.status !== 'cancelled').length;
  const pastCount = lessons.filter(l => {
    const lessonDate = new Date(l.scheduledDate);
    if (l.startTime) {
      const [hours, minutes] = l.startTime.split(':').map(Number);
      lessonDate.setHours(hours, minutes, 0, 0);
    }
    return lessonDate < new Date() && l.status !== 'cancelled';
  }).length;
  const cancelledCount = lessons.filter(l => l.status === 'cancelled').length;

  return (
    <View style={styles.container}>
      <UniqueHeader
        title="Ders Yönetimi"
        subtitle={`${lessons.length} ders`}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        showStats={true}
        stats={[
          { value: upcomingCount.toString(), label: 'Yaklaşan', icon: 'calendar-outline', color: 'rgba(255, 255, 255, 0.3)' },
          { value: pastCount.toString(), label: 'Geçmiş Dersler', icon: 'checkmark-circle-outline', color: 'rgba(255, 255, 255, 0.3)' },
        ]}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ders ara..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor={colors.textSecondary}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterContainer}
        >
          <FilterButton status="upcoming" label="Yaklaşan" />
          <FilterButton status="completed" label="Geçmiş Dersler" />
          <FilterButton status="cancelled" label="İptal Edilen" />
        </ScrollView>

        <DateCarouselPicker
          dates={availableDateKeys}
          selectedDate={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          allowClear
          allLabel="Tümü"
        />

        {/* Lessons List */}
        <ScrollView
          style={styles.lessonsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredLessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Ders bulunamadı</Text>
              <Text style={styles.emptyText}>
                {searchTerm ? 'Arama kriterlerinize uygun ders bulunamadı.' : 'Henüz ders bulunmuyor.'}
              </Text>
            </View>
          ) : (
            filteredLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))
          )}
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate('CreateLesson')}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

  {/* Lesson Details Modal */}
  <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeLessonDetails}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalOverlayTouchable} 
            activeOpacity={1}
            onPress={closeLessonDetails}
          />
          <View style={styles.modalContentWrapper}>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY: panY }]
                }
              ]}
            >
              {selectedLesson ? (
                <>
                  {/* Swipe Indicator and Header - Draggable Area */}
                  <View {...panResponder.panHandlers}>
                    <View style={styles.swipeIndicatorContainer}>
                      <View style={styles.swipeIndicator} />
                    </View>

                    {/* Gradient Header */}
                    <LinearGradient
                      colors={[colors.gradientStart, colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalHeaderGradient}
                    >
                      <View style={styles.headerTop}>
                        <View style={styles.iconCircle}>
                          <Ionicons name="fitness" size={26} color={colors.white} />
                        </View>
                        <TouchableOpacity
                          onPress={closeLessonDetails}
                          style={styles.closeButton}
                        >
                          <Ionicons name="close" size={24} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                      <View style={styles.modalStatusBadge}>
                        <Text style={[styles.modalStatusBadgeText, { color: getStatusColor(selectedLesson) }]}>
                          {getStatusText(selectedLesson)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  <View style={styles.modalInner}>
                    <ScrollView
                      style={styles.modalBody}
                      contentContainerStyle={styles.modalScrollContent}
                      showsVerticalScrollIndicator={false}
                      bounces={true}
                      keyboardShouldPersistTaps="handled"
                    >
                      {/* Info Cards */}
                      <View style={styles.infoCards}>
                        <View style={styles.infoCard}>
                          <View style={styles.infoCardIcon}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.infoCardLabel}>Tarih</Text>
                          <Text style={styles.infoCardValue}>
                            {new Date(selectedLesson.scheduledDate).toLocaleDateString('tr-TR', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>

                        <View style={styles.infoCard}>
                          <View style={styles.infoCardIcon}>
                            <Ionicons name="time-outline" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.infoCardLabel}>Saat</Text>
                          <Text style={styles.infoCardValue}>
                            {selectedLesson.startTime || new Date(selectedLesson.scheduledDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        <View style={styles.infoCard}>
                          <View style={styles.infoCardIcon}>
                            <Ionicons name="people-outline" size={20} color={colors.primary} />
                          </View>
                          <Text style={styles.infoCardLabel}>Kapasite</Text>
                          <Text style={styles.infoCardValue}>
                            {selectedLesson.currentParticipants || selectedLesson.participants?.length || selectedLesson.enrolledStudents?.length || 0}/{selectedLesson.maxStudents || selectedLesson.maxParticipants || 0}
                          </Text>
                        </View>
                      </View>

                      {/* Details Section */}
                      <View style={styles.detailsSection}>
                        <View style={styles.detailItem}>
                          <View style={styles.detailIconContainer}>
                            <Ionicons name="person-outline" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.detailTextContainer}>
                            <Text style={styles.detailItemLabel}>Eğitmen</Text>
                            <Text style={styles.detailItemValue}>{selectedLesson.trainerName || 'Belirtilmemiş'}</Text>
                          </View>
                        </View>

                        <View style={styles.detailItem}>
                          <View style={styles.detailIconContainer}>
                            <Ionicons name="barbell-outline" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.detailTextContainer}>
                            <Text style={styles.detailItemLabel}>Ders Türü</Text>
                            <Text style={styles.detailItemValue}>{selectedLesson.type || 'Belirtilmemiş'}</Text>
                          </View>
                        </View>

                        <View style={styles.detailItem}>
                          <View style={styles.detailIconContainer}>
                            <Ionicons name="hourglass-outline" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.detailTextContainer}>
                            <Text style={styles.detailItemLabel}>Süre</Text>
                            <Text style={styles.detailItemValue}>{selectedLesson.duration ? `${selectedLesson.duration} dakika` : 'Belirtilmemiş'}</Text>
                          </View>
                        </View>

                        <View style={styles.detailItem}>
                          <View style={styles.detailIconContainer}>
                            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.detailTextContainer}>
                            <Text style={styles.detailItemLabel}>Gün</Text>
                            <Text style={styles.detailItemValue}>
                              {(() => {
                                const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                                const dayIndex = new Date(selectedLesson.scheduledDate).getDay();
                                return days[dayIndex];
                              })()}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {selectedLesson.description && (
                        <View style={styles.descriptionContainer}>
                          <Text style={styles.sectionTitle}>Açıklama</Text>
                          <Text style={styles.descriptionText}>{selectedLesson.description}</Text>
                        </View>
                      )}

                      {(() => {
                        const participantIds = selectedLesson.participants || selectedLesson.enrolledStudents || [];
                        if (participantIds.length === 0) return null;
                        
                        return (
                          <View style={styles.participantsSection}>
                            <View style={styles.sectionHeader}>
                              <Text style={styles.sectionTitle}>Katılımcılar</Text>
                              <View style={styles.participantCount}>
                                <Text style={styles.participantCountText}>{participantIds.length}</Text>
                              </View>
                            </View>
                            {loadingParticipants ? (
                              <View style={styles.loadingParticipants}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.participantsLoadingText}>Yükleniyor...</Text>
                              </View>
                            ) : (
                              participantIds.map((participantId, index) => {
                                const participant = participantDetails[participantId];
                                return (
                                  <View key={index} style={styles.participantCard}>
                                    <View style={styles.participantAvatar}>
                                      <Ionicons name="person" size={22} color={colors.primary} />
                                    </View>
                                    <View style={styles.participantInfo}>
                                      <Text style={styles.participantName}>
                                        {participant?.name || 'Yükleniyor...'}
                                      </Text>
                                      {participant?.phone && participant.phone !== '-' && (
                                        <View style={styles.participantDetail}>
                                          <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
                                          <Text style={styles.participantDetailText}>{participant.phone}</Text>
                                        </View>
                                      )}
                                      {participant?.email && participant.email !== 'Email bilgisi yok' && (
                                        <View style={styles.participantDetail}>
                                          <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
                                          <Text style={styles.participantDetailText}>{participant.email}</Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                );
                              })
                            )}
                          </View>
                        );
                      })()}

                      <View style={styles.modalBottomPadding} />
                    </ScrollView>

                    {/* Bottom Action Buttons */}
                    {(() => {
                      // Check if lesson is in the past (including time)
                      const now = new Date();
                      let lessonDateTime = new Date(selectedLesson.scheduledDate);
                      
                      // Add the start time to the date
                      if (selectedLesson.startTime) {
                        const [hours, minutes] = selectedLesson.startTime.split(':').map(Number);
                        lessonDateTime.setHours(hours, minutes, 0, 0);
                      }
                      
                      const isPast = lessonDateTime < now;
                      
                      // Debug logging
                      console.log('🔍 Button Visibility Check:', {
                        lessonTitle: selectedLesson.title,
                        scheduledDate: selectedLesson.scheduledDate,
                        startTime: selectedLesson.startTime,
                        lessonDateTime: lessonDateTime.toISOString(),
                        now: now.toISOString(),
                        isPast,
                        status: selectedLesson.status,
                        willShowButtons: !isPast && selectedLesson.status !== 'cancelled' && selectedLesson.status !== 'completed'
                      });
                      
                      // Only show buttons for future lessons that are not cancelled/completed
                      if (!isPast && selectedLesson.status !== 'cancelled' && selectedLesson.status !== 'completed') {
                        return (
                          <View style={styles.modalFooter}>
                            <ScrollView 
                              horizontal 
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.footerButtonContainer}
                            >
                              <TouchableOpacity
                                style={styles.footerButton}
                                onPress={() => {
                                  closeLessonDetails();
                                  navigation.navigate('AddStudentToLesson', { lesson: selectedLesson });
                                }}
                              >
                                <View style={styles.footerButtonIcon}>
                                  <Ionicons name="person-add-outline" size={20} color={colors.white} />
                                </View>
                                <Text style={styles.footerButtonText}>Öğrenci Ekle</Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </View>
                        );
                      }
                      
                      // For past or cancelled lessons, show a simple info message
                      return (
                        <View style={styles.modalFooterInfo}>
                          <Ionicons 
                            name={selectedLesson.status === 'cancelled' ? 'close-circle' : 'checkmark-circle'} 
                            size={20} 
                            color={selectedLesson.status === 'cancelled' ? colors.error : colors.textSecondary} 
                          />
                          <Text style={styles.modalFooterInfoText}>
                            {selectedLesson.status === 'cancelled' 
                              ? 'Bu ders iptal edildi' 
                              : isPast 
                                ? 'Bu ders tamamlandı' 
                                : 'Detayları görüntülüyorsunuz'}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </>
              ) : (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.modalLoadingText}>Yükleniyor...</Text>
              </View>
            )}
            </Animated.View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 12,
    ...colors.shadow,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },

  // Filters
  filterContainer: {
    marginBottom: 12,
    maxHeight: 32,
  },
  filterButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  activeFilterButtonText: {
    color: colors.white,
  },

  // Lessons List
  lessonsList: {
    flex: 1,
  },
  lessonCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...colors.shadow,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  lessonTrainer: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  lessonType: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lessonDetails: {
    marginBottom: 8,
  },
  lessonDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lessonDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  lessonTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  lessonCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  lessonActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 6,
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContentWrapper: {
    maxHeight: '85%',
    width: '100%',
  },
  modalContent: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  swipeIndicatorContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  swipeIndicator: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  modalHeaderGradient: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalInner: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingBottom: 0,
    maxHeight: '85%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalStatusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  modalBody: {
    paddingTop: 8,
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  
  // Info Cards
  infoCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  // Details Section
  detailsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
    fontWeight: '500',
  },
  detailItemValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  // Description
  descriptionContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Participants Section
  participantsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  participantCount: {
    backgroundColor: colors.primary,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  participantCountText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    justifyContent: 'center',
  },
  participantsLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  participantDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  participantDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  modalBottomPadding: {
    height: 20,
  },
  modalLoadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Modal Footer
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
    justifyContent: 'center',
  },
  footerButton: {
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footerButtonDanger: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  footerButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  footerButtonIconDanger: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  footerButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  modalFooterInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
