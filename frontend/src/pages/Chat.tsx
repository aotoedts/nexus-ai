import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar.js';
import { ChatWindow } from '../components/ChatWindow.js';
import { InstallAppBanner } from '../components/InstallAppBanner.js';
import { useChat } from '../hooks/useChat.js';
import { apiClient } from '../api/client.js';
import { Conversation } from '../types/index.js';

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { messages, isSending, streamingContent, sendMessage } = useChat(activeId);

  const loadConversations = async () => {
    const { data } = await apiClient.get('/conversations');
    setConversations(data.conversations);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleSend = async (content: string) => {
    const conversationId = await sendMessage(content, activeId);
    if (!activeId) {
      setActiveId(conversationId);
      loadConversations();
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <InstallAppBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={() => setActiveId(undefined)}
        />
        <ChatWindow messages={messages} isSending={isSending} streamingContent={streamingContent} onSend={handleSend} />
      </div>
    </div>
  );
}
