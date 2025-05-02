import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../utils/api';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL || "https://vigilar-app-backend.onrender.com";

if (!BACKEND_URL) {
  console.warn("BACKEND_URL not defined, fallback to default");
}

export default function UserDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params;

  const [user, setUser] = useState({
    id: '',
    name: '',
    email: '',
    role: 'user',
    status: 'active',
    password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`${BACKEND_URL}/admin/user/${userId}`);
        const { id, name, email, role, status, password } = data.user;
        setUser({id, name, email, role, status, password });
      } catch (err) {
        Alert.alert('Error', 'No se pudo cargar el usuario.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`${BACKEND_URL}/admin/user/${user.id}`, user);
      Alert.alert('Éxito', 'Usuario actualizado');
    } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      Alert.alert('Error', 'No se pudo actualizar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Confirmar', '¿Seguro que deseas eliminar este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`${BACKEND_URL}/admin/user/${userId}`);
            Alert.alert('Éxito', 'Usuario eliminado');
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el usuario.');
          }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar usuario</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={user.name}
          onChangeText={(text) => setUser((u) => ({ ...u, name: text }))}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={user.email}
          onChangeText={(text) => setUser((u) => ({ ...u, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Rol</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={user.role}
            onValueChange={(value) => setUser((u) => ({ ...u, role: value }))}
          >
            <Picker.Item label="Usuario" value="user" />
            <Picker.Item label="Administrador" value="admin" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Estado</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={user.status}
            onValueChange={(value) => setUser((u) => ({ ...u, status: value }))}
          >
            <Picker.Item label="Activo" value="active" />
            <Picker.Item label="Inactivo" value="inactive" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={user.password}
          onChangeText={(text) => setUser((u) => ({ ...u, password: text }))}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>Guardar cambios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
        <Text style={styles.buttonText}>Eliminar usuario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f6f8',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#aacbff',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
});