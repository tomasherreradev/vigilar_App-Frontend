import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { api } from '../utils/api';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilar-app-backend.onrender.com";

if (!BACKEND_URL) {
  console.warn("BACKEND_URL not defined, fallback to default");
}

export default function LoginScreen() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }
  
    setIsLoading(true);
    
    try {
      const response = await api.post(`${BACKEND_URL}/auth/login`, { 
        email: email.trim().toLowerCase(), 
        password: password.trim()
      });
  
      if (response.data.success) {
        try {
          await AsyncStorage.setItem('authToken', response.data.token);
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
          
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          navigation.replace('Home');
        } catch (storageError) {
          console.error('Error guardando en AsyncStorage:', storageError);
        }
      } else {
        Alert.alert('Error', response.data.error || 'Error en el inicio de sesión');
      }
    } catch (error) {
      let errorMessage = 'Error al conectar con el servidor';
      
      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = 'Datos incompletos';
            break;
          case 401:
            errorMessage = 'Email o contraseña incorrectos';
            break;
          case 403:
            errorMessage = 'Cuenta no activa';
            break;
          case 500:
            errorMessage = 'Error del servidor';
            break;
          default:
            errorMessage = error.response.data?.error || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar al servidor';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNavigation = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Control de Rondas VigiLAR</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button 
        title={isLoading ? "Cargando..." : "Iniciar Sesión"} 
        onPress={handleLogin} 
        disabled={isLoading}
      />
      
      <TouchableOpacity onPress={handleRegisterNavigation}>
        <Text style={styles.registerText}>¿No tienes cuenta? Regístrate aquí</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: { 
    fontSize: 24, 
    marginBottom: 30, 
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  registerText: {
    marginTop: 20,
    color: '#007bff',
    fontSize: 16,
  },
});