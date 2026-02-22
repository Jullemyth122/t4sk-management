// src/dashboard/Bcomponent/AICopilotPanel.jsx
// AI Co-Pilot — Conversational sidebar panel

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const SUGGESTED_PROMPTS = [
  { icon: '⏰', text: 'What tasks are overdue?' },
  { icon: '👥', text: 'Who has the most tasks?' },
  { icon: '📊', text: 'Summarize today\'s progress' },
  { icon: '📝', text: 'Draft a standup for me' },
  { icon: '🎯', text: 'What should I work on next?' },
  { icon: '⚖️', text: 'How is the workload distributed?' },
];

// Sparkle icon for the header
const SparkleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
  </svg>
);

// Close icon
const CloseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Send icon
const SendIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// Trash icon for clear
const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

// Check icon
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Thinking dots animation
function ThinkingDots() {
  return (
    <div className="ai-thinking-dots">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}

/**
 * Renders markdown-lite text: **bold**, bullet points, and code blocks.
 */
function renderMessageContent(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  lines.forEach((line, i) => {
    // Code block fencing
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="ai-code-block">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().replace('```', '');
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<br key={`br-${i}`} />);
      return;
    }

    // Heading lines (##, ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const Tag = `h${Math.min(level + 2, 6)}`; // h3-h6
      elements.push(<Tag key={`h-${i}`} className="ai-msg-heading">{formatInline(headingMatch[2])}</Tag>);
      return;
    }

    // Bullet points
    if (line.trim().match(/^[-•*]\s+/)) {
      const content = line.trim().replace(/^[-•*]\s+/, '');
      elements.push(
        <div key={`li-${i}`} className="ai-msg-bullet">
          <span className="bullet-dot">•</span>
          <span>{formatInline(content)}</span>
        </div>
      );
      return;
    }

    // Numbered items
    const numMatch = line.trim().match(/^(\d+)[.)]\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="ai-msg-bullet">
          <span className="bullet-dot">{numMatch[1]}.</span>
          <span>{formatInline(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular text
    elements.push(<p key={`p-${i}`} className="ai-msg-para">{formatInline(line)}</p>);
  });

  return elements;
}

/** Inline formatting: **bold**, `code`, *italic* */
function formatInline(text) {
  if (!text) return text;
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);

    let firstMatch = null;
    let firstIdx = Infinity;

    if (boldMatch && remaining.indexOf(boldMatch[0]) < firstIdx) {
      firstIdx = remaining.indexOf(boldMatch[0]);
      firstMatch = { type: 'bold', match: boldMatch };
    }
    if (codeMatch && remaining.indexOf(codeMatch[0]) < firstIdx) {
      firstIdx = remaining.indexOf(codeMatch[0]);
      firstMatch = { type: 'code', match: codeMatch };
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    // Text before the match
    if (firstIdx > 0) {
      parts.push(remaining.slice(0, firstIdx));
    }

    if (firstMatch.type === 'bold') {
      parts.push(<strong key={`b-${key++}`}>{firstMatch.match[1]}</strong>);
      remaining = remaining.slice(firstIdx + firstMatch.match[0].length);
    } else if (firstMatch.type === 'code') {
      parts.push(<code key={`c-${key++}`} className="ai-inline-code">{firstMatch.match[1]}</code>);
      remaining = remaining.slice(firstIdx + firstMatch.match[0].length);
    }
  }

  return parts;
}


// ─── Action Card Component ───────────────────────────────────────────────────

function ActionCard({ action, onExecute, executed }) {
  if (!action) return null;

  const getActionLabel = () => {
    switch (action.type) {
      case 'create_card': return 'Create Task';
      case 'update_card': return 'Update Task';
      default: return 'Execute';
    }
  };

  const getActionDetails = () => {
    switch (action.type) {
      case 'create_card':
        return (
          <>
            <div className="ai-action-field">
              <span className="ai-action-label">Title:</span>
              <span className="ai-action-value">{action.title}</span>
            </div>
            {action.listName && (
              <div className="ai-action-field">
                <span className="ai-action-label">List:</span>
                <span className="ai-action-value">{action.listName}</span>
              </div>
            )}
            {action.priority && (
              <div className="ai-action-field">
                <span className="ai-action-label">Priority:</span>
                <span className={`ai-action-priority ai-priority-${action.priority}`}>{action.priority}</span>
              </div>
            )}
            {action.assignees?.length > 0 && (
              <div className="ai-action-field">
                <span className="ai-action-label">Assign to:</span>
                <span className="ai-action-value">{action.assignees.join(', ')}</span>
              </div>
            )}
          </>
        );
      case 'update_card':
        return (
          <>
            <div className="ai-action-field">
              <span className="ai-action-label">Card:</span>
              <span className="ai-action-value">{action.cardTitle}</span>
            </div>
            {action.updates && Object.entries(action.updates).map(([k, v]) => (
              <div key={k} className="ai-action-field">
                <span className="ai-action-label">{k}:</span>
                <span className="ai-action-value">{String(v)}</span>
              </div>
            ))}
          </>
        );
      default:
        return <div className="ai-action-field">Action: {action.type}</div>;
    }
  };

  return (
    <div className={`ai-action-card ${executed ? 'executed' : ''}`}>
      <div className="ai-action-header">
        <SparkleIcon size={14} />
        <span>Suggested Action</span>
      </div>
      <div className="ai-action-body">
        {getActionDetails()}
      </div>
      <button
        className={`ai-action-execute-btn ${executed ? 'done' : ''}`}
        onClick={onExecute}
        disabled={executed}
      >
        {executed ? (
          <><CheckIcon /> Done</>
        ) : (
          <>{getActionLabel()}</>
        )}
      </button>
    </div>
  );
}


// ─── Main Panel Component ────────────────────────────────────────────────────

export default function AICopilotPanel({
  open,
  onClose,
  messages,
  isThinking,
  error,
  onSendMessage,
  onExecuteAction,
  onClearHistory,
  boardName = 'Board',
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isThinking) return;
    onSendMessage(input.trim());
    setInput('');
  }, [input, isThinking, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestionClick = useCallback((text) => {
    onSendMessage(text);
  }, [onSendMessage]);

  if (!open) return null;

  const panel = (
    <div className="ai-copilot-overlay" onClick={onClose}>
      <div className="ai-copilot-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ai-copilot-header">
          <div className="ai-copilot-header-left">
            <div className="ai-copilot-icon">
              <SparkleIcon size={16} />
            </div>
            <div className="ai-copilot-header-text">
              <h3>AI Co-Pilot</h3>
              <span className="ai-copilot-board-name">{boardName}</span>
            </div>
          </div>
          <div className="ai-copilot-header-actions">
            {messages.length > 0 && (
              <button
                className="ai-copilot-clear-btn"
                onClick={onClearHistory}
                title="Clear conversation"
              >
                <TrashIcon />
              </button>
            )}
            <button
              className="ai-copilot-close-btn"
              onClick={onClose}
              title="Close Co-Pilot"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="ai-copilot-messages">
          {messages.length === 0 && !isThinking ? (
            <div className="ai-copilot-welcome">
              <div className="ai-welcome-icon">
                <SparkleIcon size={32} />
              </div>
              <h4>Hi! I'm your AI Co-Pilot</h4>
              <p>
                I can help you understand your board, track progress, and even create tasks.
                Try one of these:
              </p>
              <div className="ai-copilot-suggestions">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="ai-suggestion-chip"
                    onClick={() => handleSuggestionClick(prompt.text)}
                  >
                    <span className="ai-suggestion-icon">{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`ai-msg ${msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant'} ${msg.isError ? 'ai-msg-error' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="ai-msg-avatar">
                      <SparkleIcon size={14} />
                    </div>
                  )}
                  <div className="ai-msg-content">
                    {renderMessageContent(msg.content)}
                    {msg.action && (
                      <ActionCard
                        action={msg.action}
                        executed={msg.actionExecuted}
                        onExecute={() => onExecuteAction(msg.action, i)}
                      />
                    )}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="ai-msg ai-msg-assistant">
                  <div className="ai-msg-avatar">
                    <SparkleIcon size={14} />
                  </div>
                  <div className="ai-msg-content">
                    <ThinkingDots />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="ai-copilot-input-bar">
          {error && (
            <div className="ai-copilot-error-banner">{error}</div>
          )}
          <div className="ai-copilot-input-wrap">
            <textarea
              ref={inputRef}
              className="ai-copilot-input"
              placeholder="Ask me anything about this board..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isThinking}
            />
            <button
              className="ai-copilot-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              title="Send message"
            >
              <SendIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
