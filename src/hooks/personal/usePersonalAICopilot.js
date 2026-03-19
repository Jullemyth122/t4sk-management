import { useState, useCallback, useRef } from 'react';
import { buildBoardContext, sendCopilotMessage } from '../../services/aiCopilotService';
import * as boardSvc from '../../services/boardService';

export function usePersonalAICopilot({
  selectedBoard,
  lists,
  cardsMap,
  uid,
  currentUserEmail,
  currentUserDisplayName,
  dispatchSet
}) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isThinking) return;

    setError(null);
    abortRef.current = false;

    const userMsg = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Mock members and workload Map for personal user
      const members = [{ uid, email: currentUserEmail, name: currentUserDisplayName }];
      const workloadMap = { [uid]: 0 }; // simplified workload

      const boardContext = buildBoardContext({
        board: selectedBoard,
        lists,
        cardsMap,
        members,
        workloadMap,
        currentUserEmail,
        currentUserUid: uid,
      });

      const currentMessages = [...messages, userMsg];
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await sendCopilotMessage(text.trim(), boardContext, history);

      if (abortRef.current) return;

      const assistantMsg = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        action: response.action || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[usePersonalAICopilot] Error:', err);
      setError(err?.message || 'Something went wrong. Please try again.');

      const errorMsg = {
        role: 'assistant',
        content: `⚠️ ${err?.message || 'Failed to get a response. Please try again.'}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, selectedBoard, lists, cardsMap, currentUserEmail, currentUserDisplayName, messages, uid]);

  const executeAction = useCallback(async (action, messageIndex) => {
    if (!action || !action.type) return;

    try {
      if (action.type === 'create_card') {
        const targetList = lists.find(l =>
          l.name.toLowerCase().trim() === (action.listName || '').toLowerCase().trim()
        ) || lists[0];

        if (!targetList) {
          setError('No list found to create the card in.');
          return;
        }

        const cardData = {
          title: action.title || 'New Task',
          description: action.description || '',
          priority: action.priority || 'medium',
          assignees: [uid], // Only assign to self in personal
          status: 'todo',
          createdAt: new Date(),
          createdBy: uid
        };

        // Call direct service
        await boardSvc.createCard({
          uid,
          boardId: selectedBoard.id,
          listId: targetList.id,
          card: cardData,
          actorName: currentUserDisplayName,
          boardName: selectedBoard.name
        });

        setMessages(prev => prev.map((m, i) =>
          i === messageIndex
            ? { ...m, actionExecuted: true }
            : m
        ));
      }

      if (action.type === 'update_card') {
        const targetList = lists.find(l =>
          l.name.toLowerCase().trim() === (action.listName || '').toLowerCase().trim()
        );

        if (targetList) {
          const cards = cardsMap[targetList.id] || [];
          const targetCard = cards.find(c =>
            c.title.toLowerCase().trim() === (action.cardTitle || '').toLowerCase().trim()
          );

          if (targetCard && action.updates) {
            await boardSvc.updateCard({
              uid,
              boardId: selectedBoard.id,
              listId: targetList.id,
              cardId: targetCard.id,
              updates: action.updates,
            });

            setMessages(prev => prev.map((m, i) =>
              i === messageIndex
                ? { ...m, actionExecuted: true }
                : m
            ));
          }
        }
      }
    } catch (err) {
      console.error('[usePersonalAICopilot] Action execution failed:', err);
      setError(err?.message || 'Failed to execute action.');
    }
  }, [lists, cardsMap, selectedBoard, uid, currentUserDisplayName]);

  const clearHistory = useCallback(() => {
    abortRef.current = true;
    setMessages([]);
    setError(null);
    setIsThinking(false);
  }, []);

  return {
    messages,
    isThinking,
    error,
    sendMessage,
    executeAction,
    clearHistory,
  };
}
