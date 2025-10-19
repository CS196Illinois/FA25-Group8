import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app } from '../firebaseConfig';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const auth = getAuth(app);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('studysessions'); // Assuming 'studysessions' is your main screen
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const auth = getAuth(app);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      navigation.replace('studysessions');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>StudySync</Text>
        <Text style={styles.subtitle}>{isSignUp ? 'Create an Account' : 'Welcome Back'}</Text>
        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={isSignUp ? handleSignUp : handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>{isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center'
  },
  formContainer: {
    width: '85%', maxWidth: 400, backgroundColor: 'white', borderRadius: 12, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5
  },
  title: {
    fontSize: 32, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center', marginBottom: 8
  },
  subtitle: {
    fontSize: 18, color: '#6B7280', textAlign: 'center', marginBottom: 24
  },
  input: {
    height: 50, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 16, marginBottom: 16, fontSize: 16, backgroundColor: '#F9FAFB'
  },
  button: {
    backgroundColor: '#3B82F6', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  buttonText: {
    color: 'white', fontSize: 16, fontWeight: '600'
  },
  toggleText: {
    color: '#3B82F6', textAlign: 'center', marginTop: 16, fontSize: 14
  }
});
