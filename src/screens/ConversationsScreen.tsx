import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  AppState,
  TextInput,
} from 'react-native';
import { chatApi } from '../services/api';
import { websocketService } from '../services/websocket';
import { notificationService } from '../services/notifications';
import { Conversation } from '../types/Conversation';

interface ConversationsScreenProps {
  onSelectConversation: (conversation: Conversation) => void;
}

export default function ConversationsScreen({ onSelectConversation }: ConversationsScreenProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadConversations();
    connectWebSocket();

    // Don't disconnect on unmount - keep WebSocket alive
    // to receive real-time updates even when not viewing conversations
  }, []);

  const connectWebSocket = () => {
    websocketService.onConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    websocketService.onConversationUpdate = (updatedConversation) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === updatedConversation.id) {
            // Solo actualizar campos que vienen definidos
            // NO sobrescribir last_message si no viene (puede ser un update solo de foto/nombre)
            return {
              ...conv,
              ...(updatedConversation.name && { name: updatedConversation.name }),
              ...(updatedConversation.profile_pic_url !== undefined && { profile_pic_url: updatedConversation.profile_pic_url }),
              ...(updatedConversation.last_message && { last_message: updatedConversation.last_message }),
              ...(updatedConversation.last_message_time && { last_message_time: updatedConversation.last_message_time }),
            };
          }
          return conv;
        })
      );
    };

    websocketService.onConversationRead = (conversationId) => {
      console.log('📖 Resetting unread count for:', conversationId);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    };

    // Handle new messages to update conversation list
    websocketService.onNewMessage = (newMessage) => {
      console.log('📨 New message received in conversations screen:', newMessage.conversation_id);

      // Show local notification if app is in background
      const appState = AppState.currentState;
      if (appState === 'background' || appState === 'inactive') {
        // Find conversation name for better notification
        const conversation = conversations.find(c => c.id === newMessage.conversation_id);
        const title = conversation?.name || 'Nuevo mensaje';

        notificationService.scheduleLocalNotification(
          title,
          newMessage.body || '(media)',
          { conversationId: newMessage.conversation_id }
        );
      }

      // ✅ Actualizar SOLO la conversación modificada (tipo WhatsApp - no recarga todo)
      setConversations((prevConversations) => {
        // Verificar si la conversación ya existe
        const existingConvIndex = prevConversations.findIndex(
          (conv) => conv.id === newMessage.conversation_id
        );

        let updatedConversations: Conversation[];

        if (existingConvIndex !== -1) {
          // Conversación existe - actualizar
          updatedConversations = prevConversations.map((conv) => {
            if (conv.id === newMessage.conversation_id) {
              return {
                ...conv,
                last_message: newMessage.body || '(media)',
                last_message_time: newMessage.timestamp,
                // Solo incrementar unread_count si es mensaje ENTRANTE
                unread_count: newMessage.direction === 'inbound'
                  ? conv.unread_count + 1
                  : conv.unread_count,
              };
            }
            return conv;
          });
        } else {
          // Conversación nueva - agregar a la lista
          console.log('➕ Adding new conversation:', newMessage.conversation_id);
          const newConversation: Conversation = {
            id: newMessage.conversation_id,
            name: `Usuario ${newMessage.conversation_id.slice(-4)}`,
            phone: newMessage.conversation_id,
            last_message: newMessage.body || '(media)',
            last_message_time: newMessage.timestamp,
            profile_pic_url: null,
            unread_count: newMessage.direction === 'inbound' ? 1 : 0,
            source: 'whapi',
          };
          updatedConversations = [...prevConversations, newConversation];
        }

        // Re-ordenar por timestamp más reciente primero
        return updatedConversations.sort((a, b) => {
          if (!a.last_message_time) return 1;
          if (!b.last_message_time) return -1;
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        });
      });
    };

    websocketService.connect();
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatApi.getConversations();
      console.log('✅ Conversaciones cargadas:', data.length);
      console.log('📋 Primera conversación:', data[0]?.name || 'ninguna');
      setConversations(data);
      setFilteredConversations(data);
    } catch (error: any) {
      console.error('❌ Error loading conversations:', error.message);
      console.error('Full error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter conversations based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter((conv) =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.phone.includes(searchQuery)
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (hours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    // Determine avatar color based on source: Twilio or both = green, Whapi = blue
    const avatarColor = (item.source === 'twilio' || item.source === 'both') ? styles.avatarTwilio : styles.avatarWhapi;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onSelectConversation(item)}
      >
        {item.profile_pic_url ? (
          <Image
            source={{ uri: item.profile_pic_url }}
            style={styles.avatar}
            defaultSource={require('../../assets/icon.png')}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, avatarColor]}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.last_message_time)}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text style={styles.conversationMessage} numberOfLines={1}>
            {item.last_message || 'Sin mensajes'}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando conversaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BSL Chat</Text>
        <View style={[styles.connectionIndicator, isConnected && styles.connected]} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar conversaciones..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay conversaciones</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
  },
  connected: {
    backgroundColor: '#4CD964',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTwilio: {
    backgroundColor: '#4CD964', // Green for Twilio
  },
  avatarWhapi: {
    backgroundColor: '#007AFF', // Blue for Whapi
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 78,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
