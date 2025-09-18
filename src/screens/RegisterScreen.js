import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomInput, CustomButton } from '../components/UI';
import { colors } from '../constants/colors';
import { registerUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { setUserData, setApprovalStatus } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gerekli';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gerekli';
    }
    
    if (!formData.email) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Telefon numarası gerekli';
    } else if (!/^[0-9+\-\s()]+$/.test(formData.phone)) {
      newErrors.phone = 'Geçerli bir telefon numarası girin';
    }
    
    if (!formData.password) {
      newErrors.password = 'Şifre gerekli';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gerekli';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    if (!agreeToTerms) {
      newErrors.terms = 'Kullanım koşullarını kabul etmelisiniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await registerUser(
        formData.email, 
        formData.password, 
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        }
      );
      
      if (result.success) {
        // Update context with user data for immediate state change
        if (result.userData) {
          setUserData(result.userData);
          setApprovalStatus('pending');
        }
        
        Alert.alert(
          'Başarılı', 
          result.message,
          [
            {
              text: 'Tamam'
              // App will automatically navigate to pending approval screen
            }
          ]
        );
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.lightGray]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/zenith_logo_rounded.jpeg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              
              <Text style={styles.title}>Hesap Oluşturun</Text>
              <Text style={styles.subtitle}>
                Zénith Pilates & Yoga Studio'ya katılın
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <View style={styles.nameRow}>
                  <View style={styles.nameInput}>
                    <CustomInput
                      label="Ad"
                      value={formData.firstName}
                      onChangeText={(value) => updateFormData('firstName', value)}
                      placeholder="Adınız"
                      error={errors.firstName}
                    />
                  </View>
                  <View style={styles.nameInput}>
                    <CustomInput
                      label="Soyad"
                      value={formData.lastName}
                      onChangeText={(value) => updateFormData('lastName', value)}
                      placeholder="Soyadınız"
                      error={errors.lastName}
                    />
                  </View>
                </View>
                
                <CustomInput
                  label="E-posta"
                  value={formData.email}
                  onChangeText={(value) => updateFormData('email', value)}
                  placeholder="ornek@email.com"
                  keyboardType="email-address"
                  error={errors.email}
                />
                
                <CustomInput
                  label="Telefon"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData('phone', value)}
                  placeholder="+90 555 123 45 67"
                  keyboardType="phone-pad"
                  error={errors.phone}
                />
                
                <CustomInput
                  label="Şifre"
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  placeholder="Şifrenizi oluşturun"
                  secureTextEntry
                  error={errors.password}
                />
                
                <CustomInput
                  label="Şifre Tekrarı"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  placeholder="Şifrenizi tekrar girin"
                  secureTextEntry
                  error={errors.confirmPassword}
                />
                
                {/* Terms and Conditions */}
                <TouchableOpacity 
                  style={styles.termsContainer}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                >
                  <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                    {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>
                    <Text style={styles.termsLink}>Kullanım Koşulları</Text> ve{' '}
                    <Text style={styles.termsLink}>Gizlilik Politikası</Text>'nı kabul ediyorum
                  </Text>
                </TouchableOpacity>
                {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
                
                <CustomButton
                  title={loading ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"}
                  onPress={handleRegister}
                  disabled={loading}
                  style={styles.registerButton}
                />
              </View>
            </View>

            {/* Login Link Section */}
            <View style={styles.loginSection}>
              <View style={styles.loginTextContainer}>
                <Text style={styles.loginText}>
                  Zaten hesabınız var mı?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Giriş Yapın</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '600',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  nameRow: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  nameInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gray,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: -8,
    marginBottom: 8,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loginTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});
