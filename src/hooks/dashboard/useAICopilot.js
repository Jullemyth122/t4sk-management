// hooks/dashboard/useAICopilot.js
// React hook for managing AI Co-Pilot chat state and actions

import { useState, useCallback, useRef } from 'react';
import { buildBoardContext, sendCopilotMessage } from '../../services/aiCopilotService';

/**
 * useAICopilot — Manages co-pilot chat state and handles sending messages / executing actions.
 *
 * @param {Object} params
 * @param {Object} params.selectedBoard - Currently selected board object
 * @param {Array}  params.lists - Board lists
 * @param {Object} params.cardsMap - listId -> cards array
 * @param {Array}  params.members - Business members
 * @param {Object} params.workloadMap - uid -> task count
 * @param {string} params.businessId
 * @param {string} params.uid - Current user UID
 * @param {string} params.currentUserEmail
 * @param {Function} params.handleCreateCardForList - Card creation handler
 * @param {Function} params.handleUpdateCard - Card update handler
 * @param {Function} params.dispatchSet - Dashboard state setter
 */
export function useAICopilot({
  selectedBoard,
  lists,
  cardsMap,
  members,
  workloadMap,
  businessId,
  uid,
  currentUserEmail,
  handleCreateCardForList,
  handleUpdateCard,
  dispatchSet,
  checkLimit,
  incrementUsage,
  onLimitReached,
}) {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

  /**
   * Send a message to the AI co-pilot.
   * Enforces per-message usage limit for Free-plan users.
   */
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || isThinking) return;

    // ── Per-message limit check ──
    if (checkLimit && !checkLimit()) {
      if (onLimitReached) onLimitReached();
      return;
    }

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
      // Build fresh board context
      const boardContext = buildBoardContext({
        board: selectedBoard,
        lists,
        cardsMap,
        members,
        workloadMap,
        currentUserEmail,
        currentUserUid: uid,
      });

      // Get current history for multi-turn
      const currentMessages = [...messages, userMsg]; // include the new user message
      const history = currentMessages.map(m => ({ role: m.role, content: m.content }));

      // Call Gemini
      const response = await sendCopilotMessage(text.trim(), boardContext, history);

      if (abortRef.current) return; // user may have cleared

      // ── Increment usage only after successful response ──
      if (incrementUsage) incrementUsage();

      const assistantMsg = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        action: response.action || null,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[useAICopilot] Error:', err);
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
  }, [isThinking, selectedBoard, lists, cardsMap, members, workloadMap, currentUserEmail, messages, checkLimit, incrementUsage, onLimitReached]);

  /**
   * Execute a structured action from the AI (e.g., create a card).
   */
  const executeAction = useCallback(async (action, messageIndex) => {
    if (!action || !action.type) return;

    try {
      if (action.type === 'create_card') {
        // Find the target list by name
        const targetList = lists.find(l =>
          l.name.toLowerCase().trim() === (action.listName || '').toLowerCase().trim()
        ) || lists[0]; // fallback to first list

        if (!targetList) {
          setError('No list found to create the card in.');
          return;
        }

        // Build the card input
        const aiAssignees = Array.isArray(action.assignees) ? action.assignees : [];
        const resolvedAssignees = aiAssignees.map(aName => {
          const lowerName = aName.toLowerCase().trim();
          // Find matching member by email, name, or uid
          const member = members.find(m => 
            (m.email && m.email.toLowerCase() === lowerName) ||
            (m.name && m.name.toLowerCase().includes(lowerName)) ||
            (m.username && m.username.toLowerCase().includes(lowerName)) ||
            (m.uid === aName || m.id === aName)
          );
          // Prefer email if available, fallback to uid, or original string
          return member ? (member.email ? member.email.toLowerCase() : (member.uid || member.id)) : aName;
        });

        const cardData = {
          title: action.title || 'New Task',
          description: action.description || '',
          priority: action.priority || 'medium',
          assignees: resolvedAssignees,
        };

        // Use the existing card creation handler
        // First set the newCardInputs for the target list, then call create
        dispatchSet('newCardInputs', prev => ({
          ...prev,
          [targetList.id]: cardData.title
        }));

        await handleCreateCardForList({
          listId: targetList.id,
          cardOverride: cardData,
        });

        // Mark the action as executed in the message
        setMessages(prev => prev.map((m, i) =>
          i === messageIndex
            ? { ...m, actionExecuted: true }
            : m
        ));
      }

      if (action.type === 'update_card') {
        // Find the card by title
        const targetList = lists.find(l =>
          l.name.toLowerCase().trim() === (action.listName || '').toLowerCase().trim()
        );

        if (targetList) {
          const cards = cardsMap[targetList.id] || [];
          const targetCard = cards.find(c =>
            c.title.toLowerCase().trim() === (action.cardTitle || '').toLowerCase().trim()
          );

          if (targetCard && action.updates) {
            await handleUpdateCard({
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
      console.error('[useAICopilot] Action execution failed:', err);
      setError(err?.message || 'Failed to execute action.');
    }
  }, [lists, cardsMap, handleCreateCardForList, handleUpdateCard, dispatchSet]);

  /**
   * Clear all chat history.
   */
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
