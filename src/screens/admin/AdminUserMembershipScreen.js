import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import UniqueHeader from '../../components/UniqueHeader';
import { colors } from '../../constants/colors';
import { useI18n } from '../../context/I18nContext';

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
    userName = 'Üye',
    packageInfo,
    remainingClasses,
    lessonCredits,
  } = route.params || {};

  const membershipData = useMemo(() => {
    if (!packageInfo) {
      return null;
    }

    const totalLessons = packageInfo.lessonCount || packageInfo.classes || 0;
    const remaining = typeof remainingClasses === 'number' ? remainingClasses : (packageInfo.remainingClasses || 0);
    const used = Math.max(totalLessons - remaining, 0);

    const assignedDate = packageInfo.assignedAt || packageInfo.packageStartDate;
    const expiryDate = packageInfo.expiryDate;

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
  }, [packageInfo, remainingClasses, lessonCredits]);

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

            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>
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
});
