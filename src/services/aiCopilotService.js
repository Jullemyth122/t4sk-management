// services/aiCopilotService.js
// AI Co-Pilot service — builds board context and communicates with Gemini

import { model } from '../config/firebase.js';

// ─── Board Context Builder ───────────────────────────────────────────────────

/**
 * Serializes board state into a compact text context for the AI system prompt.
 * Keeps token count reasonable by summarizing rather than dumping raw data.
 */
export function buildBoardContext({ board, lists, cardsMap, members, workloadMap, currentUserEmail, currentUserUid }) {
  const lines = [];

  // Board info
  lines.push(`BOARD: "${board?.name || 'Untitled'}" (ID: ${board?.id || 'N/A'})`);
  if (board?.description) lines.push(`DESC: ${board.description}`);

  // Current user
  lines.push(`\nCURRENT USER: ${currentUserEmail || 'Unknown'} (UID: ${currentUserUid || 'Unknown'})`);

  // === UID → NAME LOOKUP MAP (this is the fix) ===
  const memberLookup = {};
  (members || []).forEach(m => {
    const uid = String(m.uid || m.id || '');
    if (!uid) return;
    const display = m.name || m.username || m.email?.split('@')[0] || uid;
    memberLookup[uid] = display;
    memberLookup[uid.toLowerCase()] = display;
    if (m.email) memberLookup[m.email.toLowerCase().trim()] = display;
  });

  const getAssigneeDisplay = (assigneeIds = []) => {
    if (!assigneeIds?.length) return 'unassigned';
    return assigneeIds
      .map(id => {
        const key = String(id || '').trim();
        return memberLookup[key] || memberLookup[key.toLowerCase()] || key;
      })
      .join(', ');
  };

  // Members summary
  if (members?.length) {
    lines.push(`\nMEMBERS (${members.length}):`);
    members.forEach(m => {
      const id = m.uid || m.id;
      const name = m.name || m.username || m.email || id;
      const email = m.email || '';
      const wl = workloadMap?.[String(id)] || 0;
      const role = m.roleName || m.roleId || 'member';
      lines.push(`  - ${name} (${email}) | Role: ${role} | Active tasks: ${wl}`);
    });
  }

  // Lists + cards
  const now = new Date();
  let totalCards = 0;
  let overdueCards = [];
  let dueToday = [];

  // Track explicit tasks-per-member mapping to prevent context loss 
  const memberTasksMap = {}; 

  if (lists?.length) {
    lines.push(`\nLISTS (${lists.length}):`);
    lists.forEach(list => {
      const cards = cardsMap?.[list.id] || [];
      totalCards += cards.length;

      lines.push(`\n  LIST: "${list.name}" (${cards.length} cards)`);
      if (list.assignees?.length) {
        lines.push(`    List assignees: ${getAssigneeDisplay(list.assignees)}`);
      }

      cards.forEach(card => {
        const s = String(card.status || 'todo').toLowerCase();
        const rs = String(card.submission?.reviewStatus || '').toLowerCase();

        // Due date logic
        let dueDate = null;
        if (card.dueDate) {
          try {
            dueDate = card.dueDate?.toDate ? card.dueDate.toDate() : new Date(card.dueDate);
          } catch (e) {}
        }

        const isDone = s === 'done' || rs === 'approved';
        if (dueDate && !isDone) {
          const msLeft = dueDate.getTime() - now.getTime();
          const daysLeft = msLeft / (1000 * 60 * 60 * 24);
          if (daysLeft < 0) {
            overdueCards.push({
              ...card,
              listName: list.name,
              daysOverdue: Math.abs(Math.round(daysLeft)),
              assigneeDisplay: getAssigneeDisplay(card.assignees)
            });
          } else if (daysLeft < 1) {
            dueToday.push({
              ...card,
              listName: list.name,
              assigneeDisplay: getAssigneeDisplay(card.assignees)
            });
          }
        }

        // Card line – now uses real names
        const assigneesDisplay = getAssigneeDisplay(card.assignees);
        const priority = card.priorityLabel || card.priority || 'medium';
        const dueLine = dueDate ? ` | Due: ${dueDate.toISOString().slice(0, 10)}` : '';
        const statusLine = isDone ? 'DONE' : rs === 'rejected' ? 'REJECTED' : s === 'pending' ? 'PENDING REVIEW' : 'TODO';

        const taskString = `[${statusLine}] "${card.title}" | Priority: ${priority} | Assigned: ${assigneesDisplay}${dueLine}`;

        lines.push(`    - ${taskString}`);

        // Accumulate exactly what this member owns
        if (card.assignees && card.assignees.length > 0) {
            card.assignees.forEach(aid => {
               const key = String(aid || '').trim();
               const displayName = memberLookup[key] || memberLookup[key.toLowerCase()] || key;
               if (!memberTasksMap[displayName]) memberTasksMap[displayName] = [];
               
               // Let AI know if it's overdue or due today explicitly in their personal list
               let marker = isDone ? ' (Completed)' : '';
               if (!isDone && dueDate) {
                   const msLeft = dueDate.getTime() - now.getTime();
                   const daysLeft = msLeft / (1000 * 60 * 60 * 24);
                   if (daysLeft < 0) marker += ' - *Overdue*';
                   else if (daysLeft < 1) marker += ' - *Due today*';
                   else marker += ' - *On track*';
               } else if (!isDone) {
                   marker += ' - *On track (No Due Date)*';
               }

               memberTasksMap[displayName].push(`"${card.title}" in "${list.name}"${marker}`);
            });
        }

        if (card.subtasks?.length) {
          const completed = card.subtasks.filter(st => st.completed).length;
          lines.push(`      Subtasks: ${completed}/${card.subtasks.length} completed`);
        }
      });
    });
  }

  // Board summary + overdue section (with names)
  lines.push(`\nBOARD SUMMARY:`);
  lines.push(`  Total cards: ${totalCards}`);
  lines.push(`  Overdue: ${overdueCards.length}`);
  lines.push(`  Due today: ${dueToday.length}`);

  if (overdueCards.length) {
    lines.push(`\nOVERDUE TASKS:`);
    overdueCards.forEach(c => {
      lines.push(`  ⚠️ "${c.title}" in "${c.listName}" — ${c.daysOverdue} day(s) overdue | Assigned: ${c.assigneeDisplay}`);
    });
  }

  if (dueToday.length) {
    lines.push(`\nDUE TODAY:`);
    dueToday.forEach(c => {
      lines.push(`  🔴 "${c.title}" in "${c.listName}" | Assigned: ${c.assigneeDisplay}`);
    });
  }

  // Explicit, un-missable member breakdown to defeat AI recency-bias
  lines.push(`\nTASKS BY MEMBER (Workload Breakdown):`);
  const membersWithTasks = Object.keys(memberTasksMap);
  if (membersWithTasks.length > 0) {
      membersWithTasks.forEach(name => {
          const tasks = memberTasksMap[name];
          lines.push(`\n  ${name} (${tasks.length} total tasks):`);
          tasks.forEach(t => lines.push(`    - ${t}`));
      });
  } else {
      lines.push(`  No tasks assigned to anyone.`);
  }

  lines.push(`\nTODAY'S DATE: ${now.toISOString().slice(0, 10)}`);

  return lines.join('\n');
}


// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are T4SK Co-Pilot, an advanced AI assistant embedded in a team task management dashboard. You have direct access to the board's real-time state.

CORE CAPABILITIES:
1. TASK SUMMARIZATION: You can summarize the board's progress, identify exactly what's behind schedule, and what was recently completed. **CRITICAL: When the user asks "How many tasks do I have?", DO NOT just look at the Overdue/Due Today sections. You MUST look at the "\nTASKS BY MEMBER" section at the very end of the prompt to count ALL of their tasks (including "On track" tasks).**
2. AI-POWERED SUGGESTIONS: You can identify similar tasks, suggest assigning tasks to specific members based on their current active workload (tasks count), and recommend who is best suited to take on new work.
3. STANDUP GENERATOR: If asked to draft a standup or progress report, format it professionally:
   * **What was done:** [done/approved tasks]
   * **What's in progress:** [active/pending "On track" tasks]
   * **Blockers / At-risk:** [overdue tasks or rejected tasks]
4. SMART DEADLINES: When suggesting deadlines for new or existing tasks, analyze the current date, member workloads, and urgency to provide realistic predictions.
5. NATURAL LANGUAGE TASK CREATION: Users can ask you to "Create a high-priority task for John due Friday". You must respond with a friendly confirmation AND include a structured action block at the END of your response.

RULES:
- Be conversational, concise, and direct. Use bullet points and markdown formatting (bolding key terms) for readability.
- When summarizing a user's tasks, ALWAYS read the full list under the "TASKS BY MEMBER (Workload Breakdown)" section for their name to ensure you do not miss tasks that are "On track". Use their UID or Email to map them accurately.
- When the user asks to CREATE a task, include this exact block at the end of your message:
\`\`\`action
{"type":"create_card","listName":"<target list name>","title":"<task title>","description":"<optional description>","priority":"<low|medium|high>","assignees":["<email or uid or name>"]}
\`\`\`
- When the user asks to MOVE or UPDATE a task, include:
\`\`\`action
{"type":"update_card","listName":"<current list>","cardTitle":"<card title>","updates":{"status":"...","priority":"..."}}
\`\`\`
- If the user asks about workload optimization, suggest concrete reassignments emphasizing the current active tasks count.
- Keep responses engaging but under 400 words unless drafting a detailed report.`;


// ─── Send Message to Gemini ──────────────────────────────────────────────────

/**
 * Sends a message to the Gemini model with board context and chat history.
 *
 * @param {string} userMessage - The user's message
 * @param {string} boardContext - Serialized board context from buildBoardContext()
 * @param {Array} chatHistory - Previous messages [{role, content}]
 * @returns {Promise<{text: string, action: object|null}>}
 */
export async function sendCopilotMessage(userMessage, boardContext, chatHistory = []) {
  // Build the full prompt with context
  const contextBlock = `\n\n--- CURRENT BOARD STATE ---\n${boardContext}\n--- END BOARD STATE ---`;

  // Build conversation parts
  const parts = [];

  // System instruction + context
  parts.push({ text: SYSTEM_PROMPT + contextBlock });

  // Add relevant chat history (keep last 10 exchanges max for token efficiency)
  const recentHistory = chatHistory.slice(-20); // 20 entries = 10 exchanges
  if (recentHistory.length > 0) {
    parts.push({ text: '\n\n--- CONVERSATION HISTORY ---' });
    recentHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      parts.push({ text: `${role}: ${msg.content}` });
    });
    parts.push({ text: '--- END HISTORY ---' });
  }

  // Current user message
  parts.push({ text: `\nUSER: ${userMessage}\n\nASSISTANT:` });

  try {
    const result = await model.generateContent(parts);

    // Extract text
    let responseText = '';
    const candidates = result?.response?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const cp = candidates[0]?.content?.parts || [];
      for (const p of cp) {
        if (p.text && typeof p.text === 'string') {
          responseText = p.text;
          break;
        }
      }
    }
    if (!responseText && typeof result.response?.text === 'function') {
      responseText = await result.response.text();
    }

    // Parse any action blocks from the response
    const action = parseAIAction(responseText);

    // Clean the action block from the display text
    const cleanText = responseText
      .replace(/```action\s*\n[\s\S]*?\n```/g, '')
      .trim();

    return {
      text: cleanText || responseText,
      action,
    };
  } catch (err) {
    console.error('[AI Co-Pilot] generateContent failed:', err);
    throw new Error(err?.message || 'Failed to get AI response. Please try again.');
  }
}


// ─── Parse AI Action Blocks ──────────────────────────────────────────────────

/**
 * Extracts structured action JSON from AI response text.
 * Looks for ```action ... ``` code blocks.
 */
export function parseAIAction(text) {
  if (!text || typeof text !== 'string') return null;

  const actionMatch = text.match(/```action\s*\n([\s\S]*?)\n```/);
  if (!actionMatch) return null;

  try {
    const parsed = JSON.parse(actionMatch[1].trim());
    if (parsed && typeof parsed === 'object' && parsed.type) {
      return parsed;
    }
  } catch (e) {
    console.warn('[AI Co-Pilot] Failed to parse action block:', e);
  }
  return null;
}
