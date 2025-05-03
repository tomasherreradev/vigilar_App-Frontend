import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  RefreshControl,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Switch } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDebounce } from 'use-debounce';
import { api } from '../../utils/api';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilarapp-backend-production.up.railway.app";

export default function UserListScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  const [debouncedNameFilter] = useDebounce(nameFilter, 500);
  const [debouncedEmailFilter] = useDebounce(emailFilter, 500);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchUsers = async (isRefreshing = false) => {
    try {
      isRefreshing ? setRefreshing(true) : setLoading(true);
      const response = await api.get(`${BACKEND_URL}/admin/user/all`);
      setUsers(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la lista de usuarios.');
      console.error('Fetch users error:', error);
    } finally {
      isRefreshing ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesName = user.name.toLowerCase().includes(debouncedNameFilter.toLowerCase());
      const matchesEmail = user.email.toLowerCase().includes(debouncedEmailFilter.toLowerCase());
      const matchesActive = onlyActive ? user.status === 'active' : true;

      return matchesName && matchesEmail && matchesActive;
    });
  }, [users, debouncedNameFilter, debouncedEmailFilter, onlyActive]);

  const toggleFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFiltersExpanded(!filtersExpanded);
  };

  const onRefresh = () => {
    fetchUsers(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        Haptics.selectionAsync();
        navigation.navigate('UserDetail', { userId: item.id });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        <MaterialCommunityIcons 
          name="account-circle" 
          size={40} 
          color={item.status === 'active' ? '#28a745' : '#dc3545'} 
        />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
      </View>
      <View style={[
        styles.statusBadge,
        item.status === 'active' ? styles.activeBadge : styles.inactiveBadge
      ]}>
        <Text style={styles.statusText}>
          {item.status === 'active' ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#adb5bd" />
    </TouchableOpacity>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={60} color="#e9ecef" />
      <Text style={styles.emptyText}>No se encontraron usuarios</Text>
      <Text style={styles.emptySubtext}>Ajusta los filtros o intenta nuevamente</Text>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Gestión de Usuarios</Text>
          <Text style={styles.subtitle}>{filteredUsers.length} de {users.length} usuarios</Text>
        </View>

        {/* Filtros acordeón */}
        <TouchableOpacity 
          style={styles.filterToggleButton}
          onPress={toggleFilters}
          activeOpacity={0.7}
        >
          <Text style={styles.filterToggleText}>Filtros</Text>
          <Ionicons 
            name={filtersExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#495057" 
          />
        </TouchableOpacity>

        {filtersExpanded && (
          <View style={styles.filterContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                placeholderTextColor="#adb5bd"
                value={nameFilter}
                onChangeText={setNameFilter}
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="mail-outline" size={20} color="#6c757d" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por correo..."
                placeholderTextColor="#adb5bd"
                value={emailFilter}
                onChangeText={setEmailFilter}
                keyboardType="email-address"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mostrar solo activos</Text>
              <Switch 
                value={onlyActive} 
                onValueChange={setOnlyActive}
                trackColor={{ false: "#e9ecef", true: "#28a745" }}
                thumbColor={onlyActive ? "#fff" : "#f8f9fa"}
              />
            </View>
          </View>
        )}

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: '#495057',
  },
  listContent: {
    paddingBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userAvatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: '#e6f7ed',
  },
  inactiveBadge: {
    backgroundColor: '#fdecea',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
});