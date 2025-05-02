import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from 'use-debounce';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../utils/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilar-app-backend.onrender.com";

export default function ScansListScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userNameFilter, setUserNameFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const [totalScans, setTotalScans] = useState(0);
  const limit = 25;

  const [debouncedUserName] = useDebounce(userNameFilter, 500);
  const [debouncedZone] = useDebounce(zoneFilter, 500);
  const insets = useSafeAreaInsets();

  const fetchScans = async () => {
    try {
      setLoading(true);
  
      const formattedDate = dateFilter 
        ? dateFilter.toISOString().split('T')[0] 
        : undefined;
  
      const response = await api.get(`${BACKEND_URL}/admin/scans`, {
        params: {
          userName: debouncedUserName,
          zone: debouncedZone,
          date: formattedDate,
          page,
          limit
        }
      });
  
      setScans(response.data.scans);
      setTotalScans(response.data.total);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener los scans.');
    } finally {
      setLoading(false);
    }
  };

  const exportAllScans = async () => {
    try {
      setExporting(true);
      
      const formattedDate = dateFilter 
        ? dateFilter.toISOString().split('T')[0] 
        : undefined;
  
      const response = await axios({
        method: 'post',
        url: `${BACKEND_URL}/admin/export-scans`,
        params: {
          userName: debouncedUserName,
          zone: debouncedZone,
          date: formattedDate,
        },
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`
        }
      });
  
      const fileUri = FileSystem.cacheDirectory + 'asistencia.xlsx';
      const base64 = await blobToBase64(response.data);
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
  
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar escaneos'
      });
  
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'No se pudo generar el archivo de exportación');
    } finally {
      setExporting(false);
    }
  };
  
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(blob);
    });
  };
  
  useEffect(() => {
    fetchScans();
  }, [debouncedUserName, debouncedZone, dateFilter, page]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateFilter(selectedDate);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.scanItem}>
      <Text style={styles.userName}>{item.userName}</Text>
      <Text style={styles.zone}>Zona: {item.zone}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading && scans.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro de Asistencias</Text>

      <TextInput
        style={styles.input}
        placeholder="Filtrar por nombre de usuario"
        value={userNameFilter}
        onChangeText={setUserNameFilter}
      />

      <TextInput
        style={styles.input}
        placeholder="Filtrar por zona"
        value={zoneFilter}
        onChangeText={setZoneFilter}
      />

      <TouchableOpacity 
        style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
        onPress={exportAllScans}
        disabled={exporting}
      >
        <Text style={styles.exportButtonText}>
          {exporting ? 'Exportando...' : 'Exportar a Excel'}
        </Text>
      </TouchableOpacity>

      <View style={styles.dateFilterContainer}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>
            {dateFilter 
              ? dateFilter.toLocaleDateString('es-ES') 
              : 'Seleccionar fecha'}
          </Text>
        </TouchableOpacity>
        
        {dateFilter && (
          <Button 
            title="Limpiar" 
            onPress={() => setDateFilter(null)} 
            color="#ff4444"
          />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={dateFilter || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()} 
        />
      )}

      {scans.length === 0 && !loading ? (
        <Text style={styles.noResults}>No se encontraron scans</Text>
      ) : (
        <>
          <FlatList
            data={scans}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchScans}
          />
          <View style={[styles.paginationContainer, { paddingBottom: insets.bottom + 2 }]}>
            {Array.from({ length: Math.ceil(totalScans / limit) }, (_, i) => (
              <TouchableOpacity
                key={i + 1}
                style={[
                  styles.pageButton,
                  page === i + 1 && styles.activePageButton
                ]}
                onPress={() => setPage(i + 1)}
              >
                <Text style={page === i + 1 ? styles.activePageText : undefined}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  scanItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 8,
  },
  userName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  zone: { fontSize: 14, color: '#555', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#777', marginBottom: 4 },
  scanType: { fontSize: 14, color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  pageButton: {
    padding: 10,
    margin: 5,
    backgroundColor: '#eee',
    borderRadius: 5,
  },
  activePageButton: {
    backgroundColor: '#007bff',
  },
  activePageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  exportButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  exportButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});