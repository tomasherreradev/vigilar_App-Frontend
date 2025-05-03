import React, { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { sendScan } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilarapp-backend-production.up.railway.app";

if (!BACKEND_URL) {
  console.warn("BACKEND_URL not defined, fallback to default");
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');

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
    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
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
      Alert.alert('Escaneo exitoso', `Zona: ${payload.zone}\n\nFecha: ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('Error al interpretar el QR:', error);
      Alert.alert('Error', 'El código QR no contiene datos válidos.');
    } finally {
      setIsLoading(false);
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

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'torch' : 'off');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Ionicons name="camera-off" size={60} color="#dc3545" />
        <Text style={styles.permissionDeniedText}>No se tiene acceso a la cámara</Text>
        <Text style={styles.permissionDeniedSubtext}>Por favor, habilita los permisos de cámara en la configuración de tu dispositivo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
        enableTorch={flashMode === 'torch'}
      />
      
      {/* Overlay para guía de escaneo */}
      <View style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanHintText}>Enfoca el código QR dentro del marco</Text>
      </View>
      
      {/* Controles superiores */}
      <View style={[styles.topControls, { paddingTop: insets.top + 20 }]}>
        {isAdmin && (
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Ionicons name="stats-chart" size={24} color="white" />
            <Text style={styles.buttonText}> Dashboard</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.flashButton}
          onPress={toggleFlash}
        >
          <Ionicons 
            name={flashMode === 'torch' ? 'flash' : 'flash-off'} 
            size={28} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Controles inferiores */}
      <View style={[styles.bottomButtonsContainer, { paddingBottom: insets.bottom + 30 }]}>
        {scanned ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.scanButton]}
            onPress={() => setScanned(false)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="qr-code" size={20} color="white" />
                <Text style={styles.buttonText}> Escanear otro QR</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={confirmLogout}
          >
            <Ionicons name="log-out" size={20} color="white" />
            <Text style={styles.buttonText}> Cerrar Sesión</Text>
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
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 30,
  },
  permissionDeniedText: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  permissionDeniedSubtext: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  adminButton: {
    backgroundColor: 'rgba(0, 123, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  flashButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007bff',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  scanHintText: {
    marginTop: 30,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 10,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    minWidth: 250,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  scanButton: {
    backgroundColor: '#28a745',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});