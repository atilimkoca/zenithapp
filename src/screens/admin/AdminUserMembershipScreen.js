import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import UniqueHeader from '../../components/UniqueHeader';
import { colors } from '../../constants/colors';
import { useI18n } from '../../context/I18nContext';
import { adminService } from '../../services/adminService';

const formatDate = (value) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    return value;
  }
};

const ProgressBar = ({ label, value, total, color }) => {
  const safeTotal = total > 0 ? total : 1;
  const progress = Math.min(Math.max(value / safeTotal, 0), 1);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>
          {Math.max(0, Math.round(value))} / {Math.max(0, Math.round(safeTotal))}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

export default function AdminUserMembershipScreen({ route, navigation }) {
  const { t } = useI18n();
  const {
    userId,
    userName = 'Üye',
    userStatus = 'pending',
    packageInfo,
    remainingClasses,
    lessonCredits,
    packageExpiryDate,
    packageStartDate,
  } = route.params || {};

  const [showRenewModal, setShowRenewModal] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Check if user has been approved and has a valid package
  // If status is pending, they need approval first (show Approve button)
  const isApproved = userStatus === 'approved';
  const hasPackage = isApproved &&
    packageInfo &&
    packageInfo.packageId &&
    packageInfo.packageName &&
    packageInfo.packageName !== 'Üyelik bulunamadı' &&
    packageInfo.packageName !== 'Paket Atanmadı' &&
    packageInfo.packageName !== 'Tanımsız Paket';

  const handleRenewPress = async () => {
    try {
      const result = await adminService.getPackages();
      if (result.success) {
        setPackages(result.packages);
        setShowRenewModal(true);
      } else {
        Alert.alert('Hata', 'Paketler yüklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu');
    }
  };

  const handleConfirmRenew = async () => {
    if (!selectedPackage) {
      Alert.alert('Uyarı', 'Lütfen bir paket seçin');
      return;
    }

    const isApproval = !hasPackage;
    const actionTitle = isApproval ? 'Paketi Onayla' : 'Paketi Yenile';
    const actionButton = isApproval ? 'Onayla' : 'Yenile';
    const actionMessage = isApproval
      ? `${selectedPackage.name} paketi ile üyeyi onaylamak istediğinizden emin misiniz?\n\nBaşlangıç Tarihi: ${startDate.toLocaleDateString('tr-TR')}`
      : `${selectedPackage.name} paketi ile üyeliği yenilemek istediğinizden emin misiniz?\n\nBaşlangıç Tarihi: ${startDate.toLocaleDateString('tr-TR')}`;

    Alert.alert(
      actionTitle,
      actionMessage,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: actionButton,
          onPress: async () => {
            setRenewLoading(true);
            try {
              let result;
              if (isApproval) {
                // Approve user with package
                result = await adminService.approveUserWithPackage(userId, selectedPackage.id, startDate.toISOString());
              } else {
                // Renew package
                result = await adminService.renewPackageWithStartDate(userId, selectedPackage.id, startDate.toISOString());
              }

              if (result.success) {
                Alert.alert('Başarılı', isApproval ? 'Üye başarıyla onaylandı' : 'Paket başarıyla yenilendi', [
                  {
                    text: 'Tamam',
                    onPress: () => {
                      setShowRenewModal(false);
                      setSelectedPackage(null);
                      setStartDate(new Date());
                      navigation.goBack();
                    },
                  },
                ]);
              } else {
                Alert.alert('Hata', result.error || (isApproval ? 'Üye onaylanamadı' : 'Paket yenilenemedi'));
              }
            } catch (error) {
              Alert.alert('Hata', 'Bir hata oluştu');
            } finally {
              setRenewLoading(false);
            }
          },
        },
      ]
    );
  };

  const membershipData = useMemo(() => {
    if (!packageInfo) {
      return null;
    }

    const totalLessons = packageInfo.lessonCount || packageInfo.classes || 0;
    const remaining = typeof remainingClasses === 'number' ? remainingClasses : (packageInfo.remainingClasses || 0);
    const used = Math.max(totalLessons - remaining, 0);

    // Use root-level packageExpiryDate as primary source, fall back to packageInfo
    // This ensures consistency with freeze/unfreeze operations
    const assignedDate = packageStartDate || packageInfo.assignedAt || packageInfo.packageStartDate;
    const expiryDate = packageExpiryDate || packageInfo.expiryDate;

    let totalDays = 0;
    let remainingDays = 0;
    if (assignedDate && expiryDate) {
      const start = new Date(assignedDate);
      const end = new Date(expiryDate);
      const today = new Date();
      totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      remainingDays = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
    }

    const singularType = packageInfo.packageType || null;
    const normalizedType = singularType
      ? singularType.toString().trim().toLowerCase()
      : null;
    const showPackageType = normalizedType && normalizedType !== 'one-on-one';

    return {
      packageName: packageInfo.packageName || 'Tanımsız Paket',
      packageType: showPackageType ? packageInfo.packageType : null,
      startDate: formatDate(assignedDate || packageInfo.startDate),
      endDate: formatDate(expiryDate || packageInfo.endDate),
      totalLessons,
      remainingLessons: remaining,
      usedLessons: used,
      totalDays,
      remainingDays,
      price: packageInfo.price || packageInfo.amount || null,
      paymentType: packageInfo.paymentType || '—',
      lessonCredits: typeof lessonCredits === 'number' ? lessonCredits : remaining,
    };
  }, [packageInfo, remainingClasses, lessonCredits, packageExpiryDate, packageStartDate]);

  return (
    <View style={styles.container}>
      <UniqueHeader
        title="Üyelikler"
        subtitle={userName}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        showNotification={false}
        backgroundColor={[colors.primary, colors.primaryLight, colors.secondary]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!membershipData ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={56} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aktif üyelik bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Üyenin paket bilgileri burada görüntülenecektir.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.membershipCard}>
              <LinearGradient
                colors={['#F1F5F9', '#FFFFFF']}
                style={styles.membershipGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.packageTitleGroup}>
                    <Text style={styles.packageName}>{membershipData.packageName}</Text>
                    {membershipData.packageType ? (
                      <Text style={styles.packageType}>{membershipData.packageType}</Text>
                    ) : null}
                  </View>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.dateBadgeText}>{membershipData.startDate} - {membershipData.endDate}</Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Kalan Ders</Text>
                    <Text style={[styles.metricValue, { color: '#6366F1' }]}>
                      {membershipData.remainingLessons}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Kullanılan</Text>
                    <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                      {membershipData.usedLessons}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Toplam</Text>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                      {membershipData.totalLessons}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <ProgressBar
                  label="Ders Kullanımı"
                  value={membershipData.usedLessons}
                  total={membershipData.totalLessons}
                  color="#A855F7"
                />

                <ProgressBar
                  label="Gün Sayısı"
                  value={membershipData.totalDays - membershipData.remainingDays}
                  total={membershipData.totalDays}
                  color="#22D3EE"
                />
              </LinearGradient>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Özet Bilgiler</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Kalan Gün</Text>
                  <Text style={styles.summaryValue}>{membershipData.remainingDays}</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="book-outline" size={18} color="#4F46E5" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Kalan Ders</Text>
                  <Text style={styles.summaryValue}>{membershipData.remainingLessons}</Text>
                </View>
              </View>

              {membershipData.price ? (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="card-outline" size={18} color="#F59E0B" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Paket Ücreti</Text>
                    <Text style={styles.summaryValue}>
                      ₺{Number(membershipData.price).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {userId && (
              <TouchableOpacity style={styles.renewButton} onPress={handleRenewPress}>
                <LinearGradient
                  colors={hasPackage ? [colors.primary, colors.primaryDark] : ['#059669', '#047857']}
                  style={styles.renewButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons
                    name={hasPackage ? "refresh-outline" : "checkmark-circle-outline"}
                    size={20}
                    color={colors.white}
                  />
                  <Text style={styles.renewButtonText}>
                    {hasPackage ? 'Paketi Yenile' : 'Üyeyi Onayla'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* Renew Package Modal */}
      <Modal
        visible={showRenewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{hasPackage ? 'Paket Yenile' : 'Üyeyi Onayla'}</Text>
              <TouchableOpacity onPress={() => setShowRenewModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {userName} için paket seçin
            </Text>

            {/* Start Date Picker */}
            <View style={styles.datePickerSection}>
              <Text style={styles.datePickerLabel}>Başlangıç Tarihi</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.datePickerText}>
                  {startDate.toLocaleDateString('tr-TR')}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setStartDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
              />
            )}

            <ScrollView style={styles.packageList} showsVerticalScrollIndicator={false}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const lessonCount = pkg.classes || pkg.lessonCount || pkg.lessons || 0;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageItem, isSelected && styles.packageItemSelected]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packageDetails}>
                        {lessonCount} Ders - ₺{pkg.price || 0}
                      </Text>
                      {pkg.description && (
                        <Text style={styles.packageDescription}>{pkg.description}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRenewModal(false);
                  setSelectedPackage(null);
                }}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, !selectedPackage && styles.modalConfirmButtonDisabled]}
                onPress={handleConfirmRenew}
                disabled={!selectedPackage || renewLoading}
              >
                <LinearGradient
                  colors={!selectedPackage ? ['#ccc', '#999'] : [colors.primary, colors.primaryDark]}
                  style={styles.modalConfirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {renewLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalConfirmText}>Yenile</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  emptyState: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  membershipCard: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 20,
  },
  membershipGradient: {
    padding: 22,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  packageTitleGroup: {
    flexShrink: 1,
    paddingRight: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  packageType: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 127, 106, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
    flexShrink: 0,
  },
  dateBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 24, 16, 0.08)',
    marginVertical: 14,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 24, 16, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 24, 16, 0.08)',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 24, 16, 0.06)',
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(107, 127, 106, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  renewButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  renewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  renewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  datePickerSection: {
    marginBottom: 20,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  datePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  packageList: {
    maxHeight: 300,
  },
  packageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(107, 127, 106, 0.15)',
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  packageItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 127, 106, 0.05)',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  packageDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
