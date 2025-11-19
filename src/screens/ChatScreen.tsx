import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { chatApi } from '../services/api';
import { websocketService } from '../services/websocket';
import { Conversation } from '../types/Conversation';
import { Message } from '../types/Message';

interface ChatScreenProps {
  conversation: Conversation;
  onBack: () => void;
}

export default function ChatScreen({ conversation, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    joinConversation();

    // Mark conversation as read when opening
    chatApi.markAsRead(conversation.id);

    return () => {
      websocketService.leaveConversation(conversation.id);
    };
  }, []);

  const joinConversation = () => {
    websocketService.joinConversation(conversation.id);

    websocketService.onNewMessage = (newMessage) => {
      if (newMessage.conversation_id === conversation.id) {
        setMessages((prev) => {
          // ✅ Si el mensaje es saliente, buscar mensaje temporal para reemplazar
          if (newMessage.direction === 'outbound') {
            // Buscar mensaje temporal con mismo body y timestamp similar (últimos 5 segundos)
            const tempMsgIndex = prev.findIndex(msg =>
              msg.direction === 'outbound' &&
              msg.status === 'pending' &&
              msg.body === newMessage.body &&
              Math.abs(new Date(msg.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 5000
            );

            if (tempMsgIndex !== -1) {
              // Reemplazar mensaje temporal con mensaje real
              const updated = [...prev];
              updated[tempMsgIndex] = newMessage;
              console.log(`✅ Mensaje temporal reemplazado: ${prev[tempMsgIndex].id} → ${newMessage.id}`);
              return updated;
            }
          }

          // Si no es saliente o no se encontró mensaje temporal, agregar normalmente
          return [...prev, newMessage];
        });

        setTimeout(() => scrollToBottom(), 100);
      }
    };

    websocketService.onMessageStatusUpdate = (messageId, status) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: status as any } : msg
        )
      );
    };
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await chatApi.getMessages(conversation.id);
      setMessages(data);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      direction: 'outbound',
      body: messageText,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom(), 100);

    try {
      await chatApi.sendMessage(conversation.id, messageText);
    } catch (error) {
      console.error('Error sending message:', error);
      // Update optimistic message to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id ? { ...msg, status: 'failed' } : msg
        )
      );
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status?: string): string => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      case 'failed':
        return '✗';
      case 'pending':
        return '⏱';
      default:
        return '';
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOutbound = item.direction === 'outbound';
    const messageContent = item.body || '(media)';

    return (
      <View
        style={[
          styles.messageContainer,
          isOutbound ? styles.outboundContainer : styles.inboundContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOutbound ? styles.outboundBubble : styles.inboundBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOutbound ? styles.outboundText : styles.inboundText,
            ]}
          >
            {messageContent}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOutbound ? styles.outboundTime : styles.inboundTime,
              ]}
            >
              {formatTime(item.timestamp)}
            </Text>
            {isOutbound && item.status && (
              <Text
                style={[
                  styles.messageStatus,
                  item.status === 'read' && styles.messageStatusRead,
                ]}
              >
                {getStatusIcon(item.status)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {conversation.name}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => scrollToBottom()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe un mensaje..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  inboundContainer: {
    alignSelf: 'flex-start',
  },
  outboundContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  inboundBubble: {
    backgroundColor: '#E5E5EA',
  },
  outboundBubble: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    fontSize: 16,
  },
  inboundText: {
    color: '#000',
  },
  outboundText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  inboundTime: {
    color: '#666',
  },
  outboundTime: {
    color: '#fff',
    opacity: 0.8,
  },
  messageStatus: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginLeft: 4,
  },
  messageStatusRead: {
    color: '#4CD964',
    opacity: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
