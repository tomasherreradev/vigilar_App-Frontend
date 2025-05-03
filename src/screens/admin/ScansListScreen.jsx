import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  SafeAreaView,
  RefreshControl,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from 'use-debounce';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilarapp-backend-production.up.railway.app";

export default function ScansListScreen() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [userNameFilter, setUserNameFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const [totalScans, setTotalScans] = useState(0);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));
  const limit = 25;

  const [debouncedUserName] = useDebounce(userNameFilter, 500);
  const [debouncedZone] = useDebounce(zoneFilter, 500);
  const insets = useSafeAreaInsets();

  const toggleFilters = () => {
    Animated.timing(rotateAnim, {
      toValue: filtersExpanded ? 0 : 1,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
    setFiltersExpanded(!filtersExpanded);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const fetchScans = async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
  
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
      Alert.alert('Error', 'No se pudo obtener los escaneos');
      console.error('Fetch scans error:', error);
    } finally {
      isRefreshing ? setRefreshing(false) : setLoading(false);
    }
  };


  const exportAllScans = async () => {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const formattedDate = dateFilter 
        ? dateFilter.toISOString().split('T')[0] 
        : undefined;
  
      const response = await api.post(
        `${BACKEND_URL}/admin/export-scans`,
        {
          userName: debouncedUserName,
          zone: debouncedZone,
          date: formattedDate,
        },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
  
      const fileUri = FileSystem.cacheDirectory + 'asistencia.xlsx';
      const base64 = await blobToBase64(response.data);
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
  
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo');
        return;
      }
  
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar escaneos',
        UTI: 'com.microsoft.excel.xlsx'
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
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateFilter(selectedDate);
      setPage(1); // Reset to first page when date changes
    }
  };

  const onRefresh = () => {
    setPage(1);
    fetchScans(true);
  };

  const renderScanItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.scanItem}
      onPress={() => {
        Haptics.selectionAsync();
        Alert.alert(
          'Detalle del Escaneo',
          `Usuario: ${item.userName}\nZona: ${item.zone}\nFecha: ${new Date(item.timestamp).toLocaleString()}\nTipo: ${item.scanType || 'QR'}`
        );
      }}
    >
      <View style={styles.scanHeader}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.scanType}>{item.scanType || 'QR'}</Text>
      </View>
      <Text style={styles.zone}>{item.zone}</Text>
      <View style={styles.scanFooter}>
        <MaterialIcons name="date-range" size={14} color="#6c757d" />
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={60} color="#e9ecef" />
      <Text style={styles.emptyText}>No se encontraron escaneos</Text>
      <Text style={styles.emptySubtext}>Intenta ajustar los filtros</Text>
    </View>
  );

  if (loading && scans.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando registros...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Registro de Asistencias</Text>
          <Text style={styles.subtitle}>Total: {totalScans} escaneos</Text>
        </View>

        <TouchableOpacity 
          style={styles.filterToggleButton}
          onPress={toggleFilters}
          activeOpacity={0.7}
        >
          <Text style={styles.filterToggleText}>Filtros</Text>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons name="chevron-down" size={20} color="#495057" />
          </Animated.View>
        </TouchableOpacity>

        {filtersExpanded && (
          <View style={styles.filterContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
              placeholder="Buscar usuario..."
              placeholderTextColor="#adb5bd"
              value={userNameFilter}
              onChangeText={setUserNameFilter}
              clearButtonMode="while-editing"
            />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="location-outline" size={20} color="#6c757d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrar por zona..."
              placeholderTextColor="#adb5bd"
              value={zoneFilter}
              onChangeText={setZoneFilter}
              clearButtonMode="while-editing"
            />
          </View>

          <View style={styles.dateFilterRow}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={18} color="#495057" style={styles.dateIcon} />
              <Text style={styles.dateButtonText}>
                {dateFilter 
                  ? dateFilter.toLocaleDateString('es-ES') 
                  : 'Filtrar por fecha'}
              </Text>
            </TouchableOpacity>
            
            {dateFilter && (
              <TouchableOpacity
                style={styles.clearDateButton}
                onPress={() => {
                  setDateFilter(null);
                  setPage(1);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#dc3545" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={dateFilter || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            themeVariant="light"
          />
        )}

        <TouchableOpacity 
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={exportAllScans}
          disabled={exporting}
          activeOpacity={0.7}
        >
          {exporting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="file-download" size={20} color="white" />
              <Text style={styles.exportButtonText}>Exportar a Excel</Text>
            </>
          )}
        </TouchableOpacity>

        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderScanItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007bff']}
              tintColor="#007bff"
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {scans.length > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.pageNavButton, page === 1 && styles.pageNavButtonDisabled]}
              onPress={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? "#adb5bd" : "#495057"} />
            </TouchableOpacity>

            {Array.from({ length: Math.min(5, Math.ceil(totalScans / limit)) }, (_, i) => {
              let pageNum;
              if (Math.ceil(totalScans / limit) <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= Math.ceil(totalScans / limit) - 2) {
                pageNum = Math.ceil(totalScans / limit) - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <TouchableOpacity
                  key={pageNum}
                  style={[
                    styles.pageButton,
                    page === pageNum && styles.activePageButton
                  ]}
                  onPress={() => setPage(pageNum)}
                >
                  <Text style={[
                    styles.pageText,
                    page === pageNum && styles.activePageText
                  ]}>
                    {pageNum}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.pageNavButton, 
                page === Math.ceil(totalScans / limit) && styles.pageNavButtonDisabled
              ]}
              onPress={() => setPage(Math.min(Math.ceil(totalScans / limit), page + 1))}
              disabled={page === Math.ceil(totalScans / limit)}
            >
              <Ionicons name="chevron-forward" size={20} color={page === Math.ceil(totalScans / limit) ? "#adb5bd" : "#495057"} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    marginVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#343a40',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  filterContainer: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#495057',
    fontSize: 15,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateButtonText: {
    color: '#495057',
    fontSize: 15,
  },
  clearDateButton: {
    marginLeft: 10,
    padding: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  scanItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  scanType: {
    fontSize: 14,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  zone: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  scanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: '#6c757d',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#adb5bd',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ced4da',
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'white',
  },
  pageNavButton: {
    padding: 10,
    marginHorizontal: 5,
  },
  pageNavButtonDisabled: {
    opacity: 0.5,
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },
  activePageButton: {
    backgroundColor: '#007bff',
  },
  pageText: {
    color: '#495057',
    fontSize: 14,
  },
  activePageText: {
    color: 'white',
    fontWeight: 'bold',
  },
});