import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextInput, Switch } from 'react-native';
import { api } from '../../utils/api';
import Constants from 'expo-constants';
import { useDebounce } from 'use-debounce';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilar-app-backend.onrender.com";

if (!BACKEND_URL) {
  console.warn("BACKEND_URL not defined, fallback to default");
}

export default function UserListScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  
  const [debouncedNameFilter] = useDebounce(nameFilter, 500);
  const [debouncedEmailFilter] = useDebounce(emailFilter, 500);

  const navigation = useNavigation();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${BACKEND_URL}/admin/user/all`);
      setUsers(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la lista de usuarios.');
    } finally {
      setLoading(false);
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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.email}>{item.email}</Text>
      <Text style={item.status === 'active' ? styles.active : styles.inactive}>
        {item.status === 'active' ? 'Activo' : 'Inactivo'}
      </Text>
    </TouchableOpacity>
  );

  if (loading && users.length === 0) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Usuarios</Text>

      <TextInput
        style={styles.input}
        placeholder="Filtrar por nombre"
        value={nameFilter}
        onChangeText={setNameFilter}
      />
      <TextInput
        style={styles.input}
        placeholder="Filtrar por correo"
        value={emailFilter}
        onChangeText={setEmailFilter}
        keyboardType="email-address"
      />
      <View style={styles.switchContainer}>
        <Text>Mostrar solo activos</Text>
        <Switch value={onlyActive} onValueChange={setOnlyActive} />
      </View>

      {filteredUsers.length === 0 && !loading ? (
        <Text style={styles.noResults}>No se encontraron usuarios</Text>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={loading}
          onRefresh={fetchUsers}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  userItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 8,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
  email: { fontSize: 14, color: '#555' },
  active: { color: 'green' },
  inactive: { color: 'red' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});