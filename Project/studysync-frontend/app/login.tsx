import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from './contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);

    try {
      await signIn(email, password);
      // Navigation will be handled automatically by auth state in _layout
    } catch (error: any) {
      let errorMessage = 'Login failed';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, displayName);
      Alert.alert('Success', 'Account created successfully!');
      // Navigation will be handled automatically by auth state in _layout
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>StudySync</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create an account.' : 'Welcome Back!'}</Text>
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#9CA3AF"
            /**
             * Above was line added placeholderTextColor to improve visibility of placeholder text.
             * Some platforms affect placeholder text visibility differently.
             * Adding this line ensures consistent appearance across devices.
             * AI-ASSISTED SOLUTION 11/12/2025 by Elias Ghanayem
             */
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={isSignUp ? handleSignUp : handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>
            {isSignUp ? 'Already have an account? Login!' : "Don't have an account? Sign up!"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#F9FAFB', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  formContainer: {
    width: '85%', 
    maxWidth: 400, 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 24,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 5
  },
  title: {
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#3B82F6', 
    textAlign: 'center', 
    marginBottom: 8
  },
  subtitle: {
    fontSize: 18, 
    color: '#6B7280', 
    textAlign: 'center', 
    marginBottom: 24
  },
  input: {
    height: 50, 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 8,
    paddingHorizontal: 16, 
    marginBottom: 16, 
    fontSize: 16, 
    backgroundColor: '#F9FAFB'
  },
  button: {
    backgroundColor: '#3B82F6', 
    height: 50, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  buttonText: {
    color: 'white', 
    fontSize: 16, 
    fontWeight: '600'
  },
  toggleText: {
    color: '#3B82F6', 
    textAlign: 'center', 
    marginTop: 16, 
    fontSize: 14
  }
});