import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { sendScan } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilar-app-backend.onrender.com";

if (!BACKEND_URL) {
  console.warn("BACKEND_URL not defined, fallback to default");
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    const loadUserData = async () => {
      try {
        const userDataString = await AsyncStorage.getItem('userData');
        if (userDataString) {
          const user = JSON.parse(userDataString);
          setUserId(user.id || user.uid || user._id); 
          setIsAdmin(user.role === 'admin'); 
        }
      } catch (error) {
        console.error('Error al obtener el usuario:', error);
      }
    };

    loadUserData();
  }, []);

  const handleBarCodeScanned = async ({ data, type }) => {
    if (scanned || !userId) return;
    setScanned(true);
  
    try {
      const parsed = JSON.parse(data); 
      const payload = {
        userId,
        scanData: data, 
        scanType: type,
        timestamp: new Date().toISOString(),
        zone: parsed.zone || 'Zona desconocida',
      };
      await sendScan(payload);
      Alert.alert('Éxito', `Escaneo enviado (zona: ${payload.zone})`);
    } catch (error) {
      console.error('Error al interpretar el QR:', error);
      Alert.alert('Error', 'El código QR no contiene datos válidos.');
    } finally {
      setTimeout(() => setScanned(false), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(`${BACKEND_URL}/auth/logout`);
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir de la aplicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', onPress: handleLogout, style: 'destructive' },
      ]
    );
  };

  if (hasPermission === null) return <View style={styles.loadingContainer}><Text>Solicitando permisos de cámara...</Text></View>;
  if (hasPermission === false) return <View style={styles.loadingContainer}><Text>No se tiene acceso a la cámara</Text></View>;

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />
      
      {isAdmin && (
        <TouchableOpacity 
          style={styles.adminButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.buttonText}>Dashboard</Text>
        </TouchableOpacity>
      )}
      
      <View style={[styles.bottomButtonsContainer, { paddingBottom: insets.bottom + 20 }]}>
        {scanned ? (
          <TouchableOpacity 
            style={styles.scanButton} 
            onPress={() => setScanned(false)}
          >
            <Text style={styles.buttonText}>Escanear otro QR</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={confirmLogout}
          >
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  adminButton: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: [{ translateX: -70 }], 
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 1,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  scanButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 200,
    alignSelf: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 200,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});