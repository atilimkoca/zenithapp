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
import { loginUser, resetPassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'E-posta adresi gerekli';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçerli bir e-posta adresi girin';
    }
    
    if (!password) {
      newErrors.password = 'Şifre gerekli';
    } else if (password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalı';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        if (result.requiresApproval) {
          // User is logged in but needs approval - show appropriate message
          Alert.alert('Bilgi', result.message);
          // Navigation will be handled automatically by the auth context
        } else {
          // User is fully approved
          Alert.alert('Başarılı', result.message || 'Başarıyla giriş yaptınız!');
        }
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }

    try {
      const result = await resetPassword(email);
      if (result.success) {
        Alert.alert('Başarılı', result.message);
      } else {
        Alert.alert('Hata', result.message);
      }
    } catch (error) {
      Alert.alert('Hata', 'Şifre sıfırlama e-postası gönderilemedi.');
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
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../assets/zenith_logo_rounded.jpeg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeTitle}>Hoş Geldiniz</Text>
              <Text style={styles.welcomeSubtitle}>
                Zénith Pilates & Yoga Studio'ya giriş yapın
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <CustomInput
                  label="E-posta"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@email.com"
                  keyboardType="email-address"
                  error={errors.email}
                />
                
                <CustomInput
                  label="Şifre"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Şifrenizi girin"
                  secureTextEntry
                  error={errors.password}
                />
                
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>
                    Şifremi Unuttum
                  </Text>
                </TouchableOpacity>
                
                <CustomButton
                  title={loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
                  onPress={handleLogin}
                  disabled={loading}
                  style={styles.loginButton}
                />
              </View>
            </View>

            {/* Register Section */}
            <View style={styles.registerSection}>
              <View style={styles.registerTextContainer}>
                <Text style={styles.registerText}>
                  Hesabınız yok mu?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Kayıt Olun</Text>
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
  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  loginButton: {
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
  registerSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  registerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
});
