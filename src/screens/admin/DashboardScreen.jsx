import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation();

  const handleNavigation = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const menuItems = [
    {
      title: 'Gestión de Usuarios',
      icon: <Ionicons name="people" size={28} color="#007bff" />,
      screen: 'UserList',
      description: 'Administra los usuarios del sistema',
      color: '#e3f2fd'
    },
    {
      title: 'Registros de Escaneos',
      icon: <MaterialIcons name="qr-code-scanner" size={28} color="#28a745" />,
      screen: 'ScansList',
      description: 'Consulta el historial de escaneos',
      color: '#e8f5e9'
    },
    // {
    //   title: 'Reportes',
    //   icon: <Ionicons name="stats-chart" size={28} color="#6f42c1" />,
    //   screen: 'Reports',
    //   description: 'Genera reportes estadísticos',
    //   color: '#f3e5f5'
    // },
    // {
    //   title: 'Configuración',
    //   icon: <Ionicons name="settings" size={28} color="#6c757d" />,
    //   screen: 'Settings',
    //   description: 'Ajustes de la aplicación',
    //   color: '#f8f9fa'
    // }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Panel de Administración</Text>
            <Text style={styles.subtitle}>Bienvenido, Administrador</Text>
          </View>

          <View style={styles.gridContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.card, { backgroundColor: item.color }]}
                onPress={() => handleNavigation(item.screen)}
                activeOpacity={0.8}
              >
                <View style={styles.iconContainer}>
                  {item.icon}
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={20} color="#6c757d" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Versión 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: width * 0.43,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  iconContainer: {
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
  },
  arrowContainer: {
    position: 'absolute',
    right: 15,
    bottom: 15,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerText: {
    fontSize: 12,
    color: '#adb5bd',
  },
});