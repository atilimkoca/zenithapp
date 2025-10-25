import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import packageService from '../../services/packageService';
import UniqueHeader from '../../components/UniqueHeader';

export default function AdminUserManagementScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    loadUsers();
    loadPackages();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await adminService.getAllUsers();
      
      if (result.success) {
        setUsers(result.users);
      } else {
        Alert.alert('Hata', result.message || 'Kullanıcılar yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Hata', 'Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const result = await packageService.getActivePackages();
      if (result.success) {
        console.log('Loaded packages:', JSON.stringify(result.data, null, 2));
        setPackages(result.data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus !== 'all') {
        matchesStatus = user.status === filterStatus;
      }

      return matchesSearch && matchesStatus;
    });

    setFilteredUsers(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleApproveUser = async (selectedUser) => {
    setShowApprovalModal(false);
    setShowPackageModal(true);
  };

  const handleApproveWithPackage = async () => {
    if (!selectedUser) return;

    try {
      let packageData = null;
      
      if (selectedPackage) {
        console.log('📦 Selected package for approval:', selectedPackage);
        
        // Try multiple possible field names for lesson count
        const lessonCount = selectedPackage.lessonCount || 
                           selectedPackage.lessons || 
                           selectedPackage.classes || 
                           selectedPackage.sessionCount ||
                           0;
        
        if (lessonCount === 0) {
          Alert.alert('Uyarı', 'Seçilen paketin ders sayısı belirtilmemiş. Paketsiz onaylanacak.');
          console.warn('⚠️ Package has no lesson count, approving without package');
        }
        
        packageData = {
          id: selectedPackage.id,
          name: selectedPackage.name,
          lessonCount: lessonCount
        };
        
        console.log('📤 Sending package data for approval:', packageData);
      }

      const result = await adminService.approveUser(selectedUser.id, user.uid, packageData);
      
      if (result.success) {
        await loadUsers();
        setShowPackageModal(false);
        setSelectedUser(null);
        setSelectedPackage(null);
        Alert.alert('Başarılı', `${selectedUser.displayName || selectedUser.firstName} başarıyla onaylandı!`);
      } else {
        Alert.alert('Hata', result.message || 'Kullanıcı onaylanamadı');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      Alert.alert('Hata', 'Kullanıcı onaylanırken hata oluştu');
    }
  };

  const handleRenewPackage = async () => {
    if (!selectedUser || !selectedPackage) {
      Alert.alert('Uyarı', 'Lütfen bir paket seçin');
      return;
    }

    try {
      console.log('📦 Selected package:', selectedPackage);
      
      // Try multiple possible field names for lesson count
      const lessonCount = selectedPackage.lessonCount || 
                         selectedPackage.lessons || 
                         selectedPackage.classes || 
                         selectedPackage.sessionCount ||
                         0;
      
      if (lessonCount === 0) {
        Alert.alert('Hata', 'Seçilen paketin ders sayısı belirtilmemiş. Lütfen paketi kontrol edin.');
        console.error('❌ Package has no lesson count:', selectedPackage);
        return;
      }

      const packageData = {
        id: selectedPackage.id,
        name: selectedPackage.name,
        lessonCount: lessonCount
      };

      console.log('📤 Sending package data:', packageData);

      const result = await adminService.renewUserPackage(selectedUser.id, packageData, user.uid);
      
      if (result.success) {
        await loadUsers();
        setShowRenewModal(false);
        setSelectedUser(null);
        setSelectedPackage(null);
        Alert.alert('Başarılı', 'Paket başarıyla yenilendi!');
      } else {
        Alert.alert('Hata', result.message || 'Paket yenilenemedi');
      }
    } catch (error) {
      console.error('Error renewing package:', error);
      Alert.alert('Hata', 'Paket yenilenirken hata oluştu');
    }
  };

  const handleRejectUser = async (userId, userName, reason = '') => {
    try {
      const result = await adminService.rejectUser(userId, user.uid, reason);
      
      if (result.success) {
        await loadUsers();
        setShowApprovalModal(false);
        setSelectedUser(null);
        setRejectionReason('');
        Alert.alert('Başarılı', `${userName} reddedildi.`);
      } else {
        Alert.alert('Hata', result.message || 'Kullanıcı reddedilemedi');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      Alert.alert('Hata', 'Kullanıcı reddedilirken hata oluştu');
    }
  };

  const openApprovalModal = (user) => {
    setSelectedUser(user);
    setShowApprovalModal(true);
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setSelectedUser(null);
    setRejectionReason('');
  };

  const openRenewModal = (user) => {
    setSelectedUser(user);
    setShowRenewModal(true);
  };

  const closeRenewModal = () => {
    setShowRenewModal(false);
    setSelectedUser(null);
    setSelectedPackage(null);
  };

  const closePackageModal = () => {
    setShowPackageModal(false);
    setSelectedUser(null);
    setSelectedPackage(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isPackageExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const diff = new Date(expiryDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return colors.warning;
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return 'Bilinmeyen';
    }
  };

  const UserCard = ({ user }) => {
    const remainingLessons = user.remainingClasses || user.lessonCredits || 0;
    const packageExpiry = user.packageInfo?.expiryDate;
    const isExpired = isPackageExpired(packageExpiry);
    const daysRemaining = getDaysRemaining(packageExpiry);

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>
              {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'ÜY'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userPhone}>{user.phone}</Text>
            
            {user.status === 'approved' && (
              <>
                <View style={styles.lessonInfo}>
                  <Ionicons name="ticket-outline" size={14} color={colors.primary} />
                  <Text style={styles.lessonText}>
                    Kalan Ders: {remainingLessons}
                  </Text>
                </View>
                <View style={styles.expiryInfo}>
                  <Ionicons 
                    name="calendar-outline" 
                    size={14} 
                    color={isExpired ? colors.error : (daysRemaining <= 7 ? colors.warning : colors.success)} 
                  />
                  <Text style={[
                    styles.expiryText,
                    { color: isExpired ? colors.error : (daysRemaining <= 7 ? colors.warning : colors.textSecondary) }
                  ]}>
                    {isExpired 
                      ? 'Paket Süresi Doldu' 
                      : `Bitiş: ${formatDate(packageExpiry)} (${daysRemaining} gün)`
                    }
                  </Text>
                </View>
              </>
            )}
            
            {user.status === 'pending' && (
              <Text style={styles.userJoinDate}>
                Kayıt: {user.createdAt ? formatDate(user.createdAt) : '-'}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.userStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
              {getStatusText(user.status)}
            </Text>
          </View>
          
          <View style={styles.userActions}>
            {user.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => openApprovalModal(user)}
                >
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => openApprovalModal(user)}
                >
                  <Ionicons name="close" size={20} color={colors.white} />
                </TouchableOpacity>
              </>
            )}
            {user.status === 'approved' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.renewButton]}
                onPress={() => openRenewModal(user)}
              >
                <Ionicons name="refresh" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
            {user.status === 'rejected' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => openApprovalModal(user)}
              >
                <Ionicons name="refresh" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

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
          title="Üye Yönetimi"
          subtitle="Kullanıcı onayları"
          leftIcon="arrow-back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
        </View>
      </View>
    );
  }

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved').length;
  const rejectedCount = users.filter(u => u.status === 'rejected').length;

  return (
    <View style={styles.container}>
      <UniqueHeader
        title="Üye Yönetimi"
        subtitle={`${users.length} kullanıcı`}
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notifications')}
        showStats={true}
        stats={[
          { value: pendingCount.toString(), label: 'Bekleyen', icon: 'time-outline', color: 'rgba(255, 255, 255, 0.3)' },
          { value: approvedCount.toString(), label: 'Onaylı', icon: 'checkmark-circle-outline', color: 'rgba(255, 255, 255, 0.3)' },
        ]}
      />

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kullanıcı ara..."
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
          <FilterButton status="all" label="Tümü" />
          <FilterButton status="pending" label="Bekleyen" />
          <FilterButton status="approved" label="Onaylı" />
          <FilterButton status="rejected" label="Reddedilen" />
        </ScrollView>

        {/* Users List */}
        <ScrollView
          style={styles.usersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Kullanıcı bulunamadı</Text>
              <Text style={styles.emptyText}>
                {searchTerm ? 'Arama kriterlerinize uygun kullanıcı bulunamadı.' : 'Henüz kullanıcı bulunmuyor.'}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <UserCard key={user.id} user={user} />
            ))
          )}
        </ScrollView>
      </View>

      {/* Approval/Rejection Modal */}
      <Modal
        visible={showApprovalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeApprovalModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kullanıcı İşlemi</Text>
            
            {selectedUser && (
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>
                  {selectedUser.displayName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                </Text>
                <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.approveModalButton]}
                onPress={() => handleApproveUser(selectedUser)}
              >
                <Ionicons name="checkmark" size={20} color={colors.white} />
                <Text style={styles.modalButtonText}>Onayla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.rejectModalButton]}
                onPress={() => {
                  if (selectedUser) {
                    handleRejectUser(
                      selectedUser.id,
                      selectedUser.displayName || `${selectedUser.firstName} ${selectedUser.lastName}`,
                      rejectionReason
                    );
                  }
                }}
              >
                <Ionicons name="close" size={20} color={colors.white} />
                <Text style={styles.modalButtonText}>Reddet</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.rejectionInput}
              placeholder="Reddetme sebebi (isteğe bağlı)"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closeApprovalModal}
            >
              <Text style={styles.modalCancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Package Selection Modal */}
      <Modal
        visible={showPackageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closePackageModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paket Seç</Text>
            
            {selectedUser && (
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>
                  {selectedUser.displayName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                </Text>
                <Text style={styles.selectedUserEmail}>
                  Onaylanıyor - Paket seçimi yapılıyor
                </Text>
              </View>
            )}

            <ScrollView style={styles.packageList} showsVerticalScrollIndicator={false}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      isSelected && styles.selectedPackageCard
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    <View style={styles.packageHeader}>
                      <Text style={[
                        styles.packageName,
                        isSelected && { color: '#FFFFFF' }
                      ]}>
                        {pkg.name}
                      </Text>
                    </View>
                    <Text style={[
                      styles.packageLessons,
                      isSelected && { color: '#FFFFFF' }
                    ]}>
                      {pkg.lessonCount || pkg.lessons || pkg.classes || pkg.sessionCount || 0} Ders
                    </Text>
                    <Text style={[
                      styles.packagePrice,
                      isSelected && { color: '#FFFFFF' }
                    ]}>
                      {pkg.price || 0} ₺
                    </Text>
                    {pkg.description && (
                      <Text style={[
                        styles.packageDescription,
                        isSelected && { color: '#FFFFFF', opacity: 0.9 }
                      ]}>
                        {pkg.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleApproveWithPackage}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>
                {selectedPackage ? 'Paket ile Onayla' : 'Paketsiz Onayla'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closePackageModal}
            >
              <Text style={styles.modalCancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Renew Package Modal */}
      <Modal
        visible={showRenewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeRenewModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Paket Yenile</Text>
            
            {selectedUser && (
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>
                  {selectedUser.displayName || `${selectedUser.firstName} ${selectedUser.lastName}`}
                </Text>
                <Text style={styles.selectedUserEmail}>
                  Mevcut: {selectedUser.remainingClasses || 0} Ders
                </Text>
              </View>
            )}

            <ScrollView style={styles.packageList} showsVerticalScrollIndicator={false}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      isSelected && styles.selectedPackageCard
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                  >
                    <View style={styles.packageHeader}>
                      <Text style={[
                        styles.packageName,
                        isSelected && { color: '#FFFFFF' }
                      ]}>
                        {pkg.name}
                      </Text>
                    </View>
                    <Text style={[
                      styles.packageLessons,
                      isSelected && { color: '#FFFFFF' }
                    ]}>
                      {pkg.lessonCount || pkg.lessons || pkg.classes || pkg.sessionCount || 0} Ders
                    </Text>
                    <Text style={[
                      styles.packagePrice,
                      isSelected && { color: '#FFFFFF' }
                    ]}>
                      {pkg.price || 0} ₺
                    </Text>
                    {pkg.description && (
                      <Text style={[
                        styles.packageDescription,
                        isSelected && { color: '#FFFFFF', opacity: 0.9 }
                      ]}>
                        {pkg.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmButton, !selectedPackage && styles.disabledButton]}
              onPress={handleRenewPackage}
              disabled={!selectedPackage}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>Paketi Yenile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={closeRenewModal}
            >
              <Text style={styles.modalCancelButtonText}>İptal</Text>
            </TouchableOpacity>
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

  // Users List
  usersList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...colors.shadow,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  userPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  userJoinDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  lessonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lessonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  expiryText: {
    fontSize: 11,
    marginLeft: 4,
  },
  userStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  userActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  renewButton: {
    backgroundColor: colors.warning,
  },

  // Package Selection
  packageList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPackageCard: {
    borderColor: '#6B7F6A',
    borderWidth: 3,
    backgroundColor: '#6B7F6A',
    shadowColor: '#6B7F6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.02 }],
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 32,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    flex: 1,
    paddingRight: 8,
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageLessons: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  packagePrice: {
    fontSize: 18,
    color: colors.success,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  packageDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  confirmButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6B7F6A',
    width: '100%',
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6B7F6A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: colors.textSecondary,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  selectedUserInfo: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  selectedUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  approveModalButton: {
    backgroundColor: colors.success,
  },
  rejectModalButton: {
    backgroundColor: colors.error,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectionInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});