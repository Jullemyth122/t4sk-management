// src/pages/BusinessDashboard.jsx
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import usePagination from '../hooks/usePagination';
import BoardSidebar from './Bcomponent/BoardSidebar';
import MembersPanel from './Bcomponent/MembersPanel';
import BoardTop from './Bcomponent/BoardTop';
import ListColumn from './Bcomponent/ListColumn';
import CardItem from './Bcomponent/CardItem';
import BoardCalendar from './Bcomponent/BoardCalendar'; // NEW: Imported Calendar
import AICopilotPanel from './Bcomponent/AICopilotPanel';
import '../scss/business-dashboard.scss';

// NEW: import the OCR service
import { useUserData } from '../hooks/dashboard/useUserData';
import { useBusinessLoading } from '../hooks/dashboard/useBusinessLoading';
import { useRolesAndMembers } from '../hooks/dashboard/useRolesAndMembers';
import { useBoardsAndLists } from '../hooks/dashboard/useBoardsAndLists';
import { usePermissionsAndDerived } from '../hooks/dashboard/usePermissionsAndDerived';
import { useCards } from '../hooks/dashboard/useCards';
import { useAssigneeDropdown } from '../hooks/dashboard/useAssigneeDropdown';
import { useCopyEmail } from '../hooks/dashboard/useCopyEmail';
import { useBoardHandlers } from '../hooks/dashboard/useBoardHandlers';
import { useListHandlers } from '../hooks/dashboard/useListHandlers';
import { useCardHandlers } from '../hooks/dashboard/useCardHandlers';
import { useSubmissionHandlers } from '../hooks/dashboard/useSubmissionHandlers';
import { useOCRHandling } from '../hooks/dashboard/useOCRHandling';
import { useApplyOCR } from '../hooks/dashboard/useApplyOCR';
import { useMemberWorkload } from '../hooks/dashboard/useMemberWorkload';
import { useAICopilot } from '../hooks/dashboard/useAICopilot';
import { useFeatureLimiter } from '../hooks/dashboard/useFeatureLimiter';
import { useGenerativeBoard } from '../hooks/dashboard/useGenerativeBoard';
import UpgradeModal from '../components/UpgradeModal';

// Extracted initial state for clarity
const initialState = {
  businessId: null,
  businessName: null,
  businessOwnerUid: null,
  planType: 'free',

  boards: [],
  selectedBoardId: null,

  lists: [],
  cardsMap: {},
  allBoardsListsMap: null,

  roles: [],
  members: [],
  membersLoading: false,
  membersError: null,

  uiError: '',

  boardQuery: '',
  boardView: 'list',
  memberQuery: '',

  editingBoard: false,
  boardDraft: { name: '', description: '' },
  newBoardName: '',
  newListName: '',
  newListAssignees: [],
  assigneeSearch: '',
  assigneeDropdownOpen: false,

  listNameEditing: {},
  listNameDrafts: {},

  cardEditing: {},
  cardDrafts: {},
  newCardInputs: {},

  copiedEmailId: null,

  // OCR / upload state
  loading: false,
  ocrRaw: null,
  ocrResult: null,
  ocrError: null,
  ocrVerificationOpen: false,
  aiResult: null,
  aiVerificationOpen: false,
  showHeaderActions: false,

  // Sidebar collapse state
  sidebarCollapsed: false,
  sidebarTab: 'boards',
  memberRoleFilter: 'all',
  boardSort: 'recent',

  // OCR Preview
  previewFile: null,
  previewUrl: null,

  // Board view mode: 'kanban' | 'list' | 'calendar'
  listViewMode: localStorage.getItem('t4sk_listViewMode') || 'kanban',

  // AI Co-Pilot
  copilotOpen: false,
};

export default function BusinessDashboard({ businessId: propBusinessId = null }) {

  const { state, dispatchSet, uid, userEmail, profile, currentUser } = useUserData(propBusinessId, initialState);

  // --- Highlight from AI Insights ---
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightActive, setHighlightActive] = useState(true);

  const highlightCardIds = useMemo(() => {
    if (!highlightActive) return new Set();
    const raw = searchParams.get('highlightCards');
    if (!raw) return new Set();
    return new Set(raw.split(',').filter(Boolean));
  }, [searchParams, highlightActive]);

  const highlightColor = highlightActive ? (searchParams.get('highlightColor') || '') : '';
  const highlightBoardId = highlightActive ? searchParams.get('boardId') : null;


  // Auto-clear highlight after 8 seconds
  useEffect(() => {
    if (highlightCardIds.size === 0) return;
    const timer = setTimeout(() => {
      setHighlightActive(false);
      // Clean URL params
      searchParams.delete('highlightCards');
      searchParams.delete('highlightColor');
      searchParams.delete('boardId');
      setSearchParams(searchParams, { replace: true });
    }, 8000);
    return () => clearTimeout(timer);
  }, [highlightCardIds.size]);

  const { businessId, businessName, businessOwnerUid, planType, boards, selectedBoardId, lists, cardsMap, allBoardsListsMap, roles, members, membersLoading, membersError, uiError, boardQuery, boardView, memberQuery, editingBoard, boardDraft, newBoardName, newListName, newListAssignees, assigneeSearch, assigneeDropdownOpen, listNameEditing, listNameDrafts, cardEditing, cardDrafts, newCardInputs, copiedEmailId, loading, ocrRaw, ocrResult, ocrError, ocrVerificationOpen, aiResult, aiVerificationOpen, showHeaderActions, sidebarCollapsed, sidebarTab, previewFile, previewUrl, listViewMode, copilotOpen } = state;

  const getMemberLevel = useCallback((m, rolesList = roles) => {
    if (typeof m.level === 'number') return m.level;
    const roleFromList = (rolesList || roles).find((r) => r.id === m.roleId || r.name === m.roleName);
    if (roleFromList && typeof roleFromList.level === 'number') return roleFromList.level;
    if (roleFromList && typeof roleFromList.priority === 'number') return roleFromList.priority;
    return 0;
  }, [roles]);

  const { userRoleId, userLevel, userRoleName, canEditBoardValue, canCreateBoard, canCreateList, canViewMembers, canAssignTasks, canDeleteBoard, canDeleteList, canUpdateList, canCreateCard, canUseOCR, canUseAI, canUseCalendar, isOwner, isPremium, canViewBoards, boardsFiltered, membersFiltered, listsVisible, reviewerOptions, membersMap, emailMap, filterBoardsByAssignee, filterCardsByAssignee } = usePermissionsAndDerived({ profile, businessId, planType, roles, members, boards, boardQuery, memberQuery, lists, uid, userEmail, getMemberLevel, businessOwnerUid });

  useBusinessLoading({ businessId, dispatchSet, profile, uid });
  useRolesAndMembers({ businessId, dispatchSet, businessOwnerUid, members });

  const { aiGenerating, genProgressText, aiUsageCount, isGenUnlimited, genLimitMax, handleGenerateBoard, handleApplyAIToBoard, aiApplying } = useGenerativeBoard({ businessId, uid, isOwner, planType, members, dispatchSet, businessOwnerUid });


  useBoardsAndLists({ businessId, dispatchSet, selectedBoardId, userLevel, boards, highlightBoardId, uid, userEmail });
  const { loadMoreCards, resetLimitCards, cardsLimitsMap, cardsHasMoreMap, cardsBaseLimit } = useCards({
    businessId,
    selectedBoardId,
    lists,
    dispatchSet
  });

  const { workloadMap, isOverloaded } = useMemberWorkload({ cardsMap, lists });

  // For low-level users, filter cards to only show ones assigned to them
  const filteredCardsMap = useMemo(() => filterCardsByAssignee(cardsMap), [cardsMap, filterCardsByAssignee]);


  // State for advanced filtering
  const [memberRoleFilter, setMemberRoleFilter] = useMemo(() => {
    // We'll manage this via dispatchSet to keep it consistent if needed, 
    // but a simpler local useState or just adding to initialState is better.
    // Since everything else is in 'state' via useUserData reducer, let's just add to initial state there?
    // Actually, useUserData merges propBusinessId changes. 
    // Let's use local state for UI-only filters to avoid reducer complexity for now, or add to initialState.
    // The previous pattern used 'state' monolithic object. We should stick to it.
    return [state.memberRoleFilter || 'all', (v) => dispatchSet('memberRoleFilter', v)];
  }, [state.memberRoleFilter, dispatchSet]);

  const [boardSort, setBoardSort] = useMemo(() => {
    return [state.boardSort || 'recent', (v) => dispatchSet('boardSort', v)];
  }, [state.boardSort, dispatchSet]);


  // Apply Extra Filtering (Role / Sort) on top of usePermissionsAndDerived results
  const finalMembersFiltered = useMemo(() => {
    if (!memberRoleFilter || memberRoleFilter === 'all') return membersFiltered;
    // Filter by role name or status
    if (memberRoleFilter === 'active') { // pseudo-role for status
      return membersFiltered.filter(m => (workloadMap[String(m.uid || m.id)] || 0) > 0);
    }
    if (memberRoleFilter === 'idle') {
      return membersFiltered.filter(m => (workloadMap[String(m.uid || m.id)] || 0) === 0);
    }
    // Otherwise match role id or name
    return membersFiltered.filter(m => {
      const rName = m.roleName || (roles.find(r => r.id === m.roleId)?.name);
      return String(rName) === String(memberRoleFilter) || String(m.roleId) === String(memberRoleFilter);
    });
  }, [membersFiltered, memberRoleFilter, workloadMap, roles]);

  const finalBoardsFiltered = useMemo(() => {
    let res = [...boardsFiltered];

    // For low-level users: filter boards to only show ones where user has assigned lists
    if (userLevel <= 2 && allBoardsListsMap) {
      const userIdentifiers = new Set();
      if (uid) userIdentifiers.add(String(uid).toLowerCase());
      if (userEmail) userIdentifiers.add(String(userEmail).toLowerCase());

      if (userIdentifiers.size > 0) {
        res = res.filter(board => {
          const boardLists = allBoardsListsMap[board.id] || [];
          return boardLists.some(list => {
            const assignees = list.assignees || [];
            return assignees.some(a => userIdentifiers.has(String(a).trim().toLowerCase()));
          });
        });
      }
    }

    if (boardSort === 'alpha') {
      res.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return res;
  }, [boardsFiltered, boardSort, userLevel, allBoardsListsMap, uid, userEmail]);


  const { page: boardPage, perPage: boardsPerPage, setPerPage: setBoardsPerPage, totalPages: boardsTotalPages, visible: visibleBoards, goto: gotoBoardPage, setPage: setBoardPage } = usePagination(finalBoardsFiltered, 6);
  const { page: memberPage, perPage: membersPerPage, setPerPage: setMembersPerPage, totalPages: membersTotalPages, visible: visibleMembers, goto: gotoMemberPage } = usePagination(finalMembersFiltered, 6);

  const assigneeRef = useAssigneeDropdown({ dispatchSet })

  const copyEmail = useCopyEmail({ dispatchSet });

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId) || null, [boards, selectedBoardId]);

  const { handleRefreshBoard, handleUpdateBoard, handleDeleteBoard, handleCreateBoard } = useBoardHandlers({ businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName, planType });

  const { handleCreateList, handleDeleteList, handleUpdateList } = useListHandlers({ businessId, uid, dispatchSet, selectedBoardId, cardsMap, lists, newListName, newListAssignees, canCreateList, canEditBoardValue, userLevel, userEmail });

  const actorName = currentUser?.displayName || currentUser?.email || 'User';
  const boardName = selectedBoard?.name || 'Board';

  const { handleCreateCardForList, handleUpdateCard, handleDeleteCard, handleMoveCard } = useCardHandlers({
    businessId,
    uid,
    userEmail,
    dispatchSet,
    selectedBoardId,
    cardsMap,
    lists,
    canEditBoardValue,
    canAssignTasks,
    newCardInputs,
    actorName,
    boardName
  });

  const { handleSubmitCard, handleReviewAction } = useSubmissionHandlers({
    businessId,
    uid,
    userEmail,
    dispatchSet,
    selectedBoardId,
    cardsMap,
    lists,
    selectedBoard,
    members,
    getMemberLevel,
    roles,
    userLevel,
    actorName // boardName is accessible via selectedBoard inside too, but we pass actorName
  });

  const lowLevelMembers = useMemo(() => members.filter(m => getMemberLevel(m) <= 2 && String(m.uid || m.id) !== String(businessOwnerUid)), [members, getMemberLevel, businessOwnerUid]);
  const candidateEmails = useMemo(() => Array.from(new Set(lowLevelMembers.map(m => m.email ? m.email.toLowerCase() : null).filter(Boolean))), [lowLevelMembers]);
  const excludedEmails = useMemo(() => {
    const excluded = new Set();
    if (businessOwnerUid) excluded.add(businessOwnerUid.toLowerCase());
    members.forEach(m => {
      const lvl = getMemberLevel(m);
      if (lvl > 2 || String(m.uid || m.id) === String(businessOwnerUid)) {
        if (m.uid) excluded.add(m.uid.toLowerCase());
        if (m.email) excluded.add(m.email.toLowerCase());
      }
    });
    return Array.from(excluded);
  }, [members, getMemberLevel, businessOwnerUid]);

  const { handleUpload } = useOCRHandling({ dispatchSet, members, getMemberLevel, roles, businessOwnerUid, candidateEmails, excludedEmails });

  const { handleApplyOCRToBoard } = useApplyOCR({ selectedBoardId, canCreateList, ocrResult, lists, businessId, uid, dispatchSet, cardsMap, emailMap, members, membersMap, getMemberLevel, roles, businessOwnerUid });

  const { checkLimit, incrementUsage, getRemainingUses, maxUses } = useFeatureLimiter(businessId, uid, planType, isOwner);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('');

  const handleOpenUpgrade = (featureName) => {
    setUpgradeFeatureName(featureName);
    setUpgradeModalOpen(true);
  };

  // Panel always opens freely; the limit is enforced per-message inside useAICopilot
  const handleOpenCopilot = () => {
    dispatchSet('copilotOpen', prev => !prev);
  };

  // Save view mode
  useEffect(() => {
    localStorage.setItem('t4sk_listViewMode', listViewMode);
  }, [listViewMode]);

  // AI Co-Pilot
  const copilot = useAICopilot({
    selectedBoard,
    lists: listsVisible,
    cardsMap,
    members,
    workloadMap,
    businessId,
    uid,
    currentUserEmail: userEmail,
    handleCreateCardForList,
    handleUpdateCard,
    dispatchSet,
    checkLimit,
    incrementUsage,
    onLimitReached: () => handleOpenUpgrade('AI Co-Pilot'),
  });



  // assignee dropdown candidates
  const assigneeCandidates = useMemo(() => {
    const q = (assigneeSearch || '').toLowerCase().trim();
    const list = (members || [])
      .filter(m => String(m.uid || m.id) !== String(businessOwnerUid))
      .map(m => ({
      id: m.uid || m.id,
      email: (m.email || '').toLowerCase(),
      name: m.name || m.username || '',
    }));
    if (!q) return list;
    return list.filter(it =>
      (it.email || '').includes(q) ||
      (it.name || '').toLowerCase().includes(q) ||
      (it.id || '').toLowerCase().includes(q)
    );
  }, [members, assigneeSearch]);

  // Secure Upload Logic
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    dispatchSet('previewFile', file);
    dispatchSet('previewUrl', url);
    // Hide actions dropdown
    dispatchSet('showHeaderActions', false);

    // Reset file input value so same file can be selected again
    e.target.value = null;
  }, [dispatchSet]);

  const confirmUpload = useCallback(() => {
    if (state.previewFile) {
      handleUpload(state.previewFile);
      // Clear preview
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      dispatchSet('previewFile', null);
      dispatchSet('previewUrl', null);
    }
  }, [state.previewFile, state.previewUrl, handleUpload, dispatchSet]);

  const cancelUpload = useCallback(() => {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    dispatchSet('previewFile', null);
    dispatchSet('previewUrl', null);
  }, [state.previewUrl, dispatchSet]);

  // replace toggleAssignee in BusinessDashboard.jsx with this:
  const toggleAssignee = useCallback((value) => {
    if (!value) return;
    // If it looks like an email, normalize to lowercase. Otherwise keep as-is (UIDs)
    const isEmail = String(value).includes('@');
    const norm = isEmail ? String(value).toLowerCase() : String(value);
    dispatchSet('newListAssignees', (prev) => {
      const copy = [...prev];
      const idx = copy.findIndex(x => x === norm);
      if (idx >= 0) copy.splice(idx, 1);
      else copy.push(norm);
      return copy;
    });
  }, [dispatchSet]);

  const removeAssignee = useCallback((value) => dispatchSet('newListAssignees', (p) => p.filter(x => x !== (value || '').toLowerCase())), [dispatchSet]);

  // OCR Edit Helpers
  const updateOcrList = useCallback((lIdx, field, value) => {
    dispatchSet('ocrResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      newLists[lIdx] = { ...newLists[lIdx], [field]: value };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const updateOcrTask = useCallback((lIdx, tIdx, field, value) => {
    dispatchSet('ocrResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newItems = [...newLists[lIdx].items];
      newItems[tIdx] = { ...newItems[tIdx], [field]: value };
      newLists[lIdx] = { ...newLists[lIdx], items: newItems };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const updateOcrSubtask = useCallback((lIdx, tIdx, sIdx, field, value) => {
    dispatchSet('ocrResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newItems = [...newLists[lIdx].items];
      const newSubtasks = [...newItems[tIdx].subtasks];
      newSubtasks[sIdx] = { ...newSubtasks[sIdx], [field]: value };
      
      if (field === 'weight') {
        const total = newSubtasks.reduce((sum, st) => sum + (Number(st.weight) || 0), 0);
        if (total > 0 && total !== 100) {
          let adjustedTotal = 0;
          newSubtasks.forEach((st, idx) => {
             const newW = Math.round(((Number(st.weight) || 0) / total) * 100);
             newSubtasks[idx] = { ...st, weight: newW };
             adjustedTotal += newW;
          });
          if (adjustedTotal !== 100 && newSubtasks.length > 1) {
             const diff = 100 - adjustedTotal;
             const targetIdx = sIdx === 0 ? 1 : 0;
             newSubtasks[targetIdx].weight += diff;
          }
        }
      }

      newItems[tIdx] = { ...newItems[tIdx], subtasks: newSubtasks };
      newLists[lIdx] = { ...newLists[lIdx], items: newItems };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const addOcrAssignee = useCallback((lIdx, tIdx, item, email) => {
    if (!email) return;
    const current = Array.isArray(item.assignees) ? item.assignees : [];
    if (!current.includes(email)) {
      updateOcrTask(lIdx, tIdx, 'assignees', [...current, email]);
    }
  }, [updateOcrTask]);

  const removeOcrAssignee = useCallback((lIdx, tIdx, item, email) => {
    const current = Array.isArray(item.assignees) ? item.assignees : [];
    updateOcrTask(lIdx, tIdx, 'assignees', current.filter(e => e !== email));
  }, [updateOcrTask]);

  // --- AI Edit Helpers ---
  const [aiExpandedLists, setAiExpandedLists] = useState({});

  const toggleAIListExpand = useCallback((lIdx) => {
    setAiExpandedLists(prev => ({ ...prev, [lIdx]: !prev[lIdx] }));
  }, []);

  const updateAIBoardName = useCallback((value) => {
    dispatchSet('aiResult', (prev) => {
      if (!prev) return prev;
      return { ...prev, boardName: value };
    });
  }, [dispatchSet]);

  const updateAIList = useCallback((lIdx, field, value) => {
    dispatchSet('aiResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      newLists[lIdx] = { ...newLists[lIdx], [field]: value };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const updateAICard = useCallback((lIdx, cIdx, field, value) => {
    dispatchSet('aiResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newCards = [...(newLists[lIdx].cards || [])];
      newCards[cIdx] = { ...newCards[cIdx], [field]: value };
      newLists[lIdx] = { ...newLists[lIdx], cards: newCards };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const updateAISubtask = useCallback((lIdx, cIdx, sIdx, field, value) => {
    dispatchSet('aiResult', (prev) => {
      if (!prev || !prev.lists) return prev;
      const newLists = [...prev.lists];
      const newCards = [...(newLists[lIdx].cards || [])];
      const newSubtasks = [...(newCards[cIdx].subtasks || [])];
      newSubtasks[sIdx] = { ...newSubtasks[sIdx], [field]: value };
      newCards[cIdx] = { ...newCards[cIdx], subtasks: newSubtasks };
      newLists[lIdx] = { ...newLists[lIdx], cards: newCards };
      return { ...prev, lists: newLists };
    });
  }, [dispatchSet]);

  const addAIAssignee = useCallback((lIdx, cIdx, card, email) => {
    if (!email) return;
    const current = Array.isArray(card.assignees) ? card.assignees : [];
    if (!current.includes(email)) {
      updateAICard(lIdx, cIdx, 'assignees', [...current, email]);
    }
  }, [updateAICard]);

  const removeAIAssignee = useCallback((lIdx, cIdx, card, email) => {
    const current = Array.isArray(card.assignees) ? card.assignees : [];
    updateAICard(lIdx, cIdx, 'assignees', current.filter(e => e !== email));
  }, [updateAICard]);

  const showAside = canViewBoards || canViewMembers;

  return (
    <div className={`bd-root ${sidebarCollapsed ? 'bd-sidebar-collapsed' : ''} ${showAside ? '' : 'no-aside'}`}>

      {/* ────── LEFT SIDEBAR ────── */}
      {showAside && (
        <aside className="bd-sidebar">
          {/* Sidebar header */}
          <div className="bd-sidebar-header">
            <div className="bd-sidebar-logo">
              <div
                className="bd-sidebar-logo-mark"
                onClick={() => dispatchSet('sidebarCollapsed', prev => !prev)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                style={{ cursor: 'pointer' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {sidebarCollapsed ? (
                    /* Show expand icon when collapsed (optional, adapting from old svg) */
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    /* Default logo */
                    <path d="M3 9L12 2L21 9V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9Z" fill="currentColor" opacity="0.9" />
                  )}
                </svg>
              </div>
              <span className="bd-sidebar-logo-text">T4SK</span>
            </div>
          </div>

          {/* Business info chip */}
          <div className="bd-sidebar-biz-chip">
            <div className="bd-biz-avatar">
              {(businessName || 'B')[0].toUpperCase()}
            </div>
            <div className="bd-biz-info">
              <div className="bd-biz-name">{businessName || businessId || '—'}</div>
              <div className="bd-biz-role">
                {userRoleName ? `Role: ${userRoleName}` : userRoleId ? `Role: ${userRoleId}` : 'Business'}
              </div>
            </div>
          </div>

          {/* Tabs */}

          {(canCreateBoard || canViewMembers) && (
            <div className="bd-sidebar-tabs">
              <button
                className={`bd-tab-btn ${sidebarTab === 'boards' ? 'active' : ''}`}
                onClick={() => dispatchSet('sidebarTab', 'boards')}
                title="Boards"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="bd-tab-icon">
                  <rect x="3" y="3" width="7" height="18" rx="1.5" fill="currentColor" />
                  <rect x="13" y="3" width="8" height="11" rx="1.5" fill="currentColor" opacity="0.7" />
                </svg>
                <span className="bd-tab-label">Boards</span>
              </button>
              <button
                className={`bd-tab-btn ${sidebarTab === 'members' ? 'active' : ''}`}
                onClick={() => dispatchSet('sidebarTab', 'members')}
                title="Members"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="bd-tab-icon">
                  <circle cx="9" cy="7" r="4" fill="currentColor" />
                  <path d="M1 21v-2a7 7 0 0 1 14 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="19" cy="7" r="3" fill="currentColor" opacity="0.6" />
                  <path d="M22 21v-1.5a5 5 0 0 0-3-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
                </svg>
                <span className="bd-tab-label">Members</span>
              </button>
            </div>
          )}

          {/* Tab content */}
          <div className="bd-sidebar-content">
            {sidebarTab === 'boards' && (
              <BoardSidebar
                boards={boards}
                boardQuery={boardQuery}
                setBoardQuery={(v) => dispatchSet('boardQuery', v)}
                boardView={boardView}
                setBoardView={(v) => dispatchSet('boardView', v)}
                boardSort={boardSort}
                setBoardSort={setBoardSort}
                visibleBoards={visibleBoards}
                boardPage={boardPage}
                boardsTotalPages={boardsTotalPages}
                boardsPerPage={boardsPerPage}
                setBoardsPerPage={setBoardsPerPage}
                gotoBoardPage={gotoBoardPage}
                selectedBoardId={selectedBoardId}
                setSelectedBoardId={(id) => dispatchSet('selectedBoardId', id)}
                newBoardName={newBoardName}
                setNewBoardName={(v) => dispatchSet('newBoardName', v)}
                handleCreateBoard={handleCreateBoard}
                canEditBoardValue={canEditBoardValue}
                canCreateBoard={canCreateBoard}
                aiGenerating={aiGenerating}
                genProgressText={genProgressText}
                aiUsageCount={aiUsageCount}
                isGenUnlimited={isGenUnlimited}
                genLimitMax={genLimitMax}
                handleGenerateBoard={handleGenerateBoard}
                isOwner={isOwner}
              />
            )}

            {sidebarTab === 'members' && (
              canViewMembers ? (
                <MembersPanel
                  members={members}
                  membersLoading={membersLoading}
                  membersError={membersError}
                  memberQuery={memberQuery}
                  setMemberQuery={(v) => dispatchSet('memberQuery', v)}
                  memberRoleFilter={memberRoleFilter}
                  setMemberRoleFilter={setMemberRoleFilter}
                  membersPerPage={membersPerPage}
                  setMembersPerPage={setMembersPerPage}
                  visibleMembers={visibleMembers}
                  memberPage={memberPage}
                  membersTotalPages={membersTotalPages}
                  gotoMemberPage={gotoMemberPage}
                  roles={roles}
                  copyEmail={copyEmail}
                  copiedEmailId={copiedEmailId}
                  workloadMap={workloadMap}
                />
              ) : (
                <div className="bd-section members-panel restricted">
                  <div className="muted" style={{ padding: 20 }}>Members list is restricted for your role.</div>
                </div>
              )
            )}
          </div>
        </aside>
      )}

      {/* ────── RIGHT: MAIN AREA ────── */}
      <div className="bd-main-area">

        {/* Top Header Bar */}
        <header className="bd-header" onClick={() => { if (showHeaderActions) dispatchSet('showHeaderActions', false); }}>
          <div className="bd-head-left">
            {/* Collapse toggle inline with header on mobile */}
            {showAside && (
              <button
                className="bd-header-sidebar-toggle"
                onClick={(e) => { e.stopPropagation(); dispatchSet('sidebarCollapsed', prev => !prev); }}
                aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="bd-header-title-group">
              <h1 className="bd-title">Business Dashboard</h1>
              <div className="bd-sub">
                <span className="bd-sub-email">{currentUser?.email || '—'}</span>
                {userRoleName && <span className="bd-sub-role"> · {userRoleName}</span>}
              </div>
            </div>
          </div>

          <div className="bd-head-right">
            {/* Mobile toggle */}
            <button
              className="bd-mobile-toggle"
              aria-expanded={showHeaderActions}
              aria-label="Toggle header actions"
              onClick={(e) => { e.stopPropagation(); dispatchSet('showHeaderActions', s => !s); }}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Actions */}
            <div className={`bd-actions ${showHeaderActions ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
              {selectedBoard && (
                <>
                  {canUseOCR && (
                    <label className={`bd-action-btn ${loading ? 'bd-action-btn--disabled' : ''}`} title="Upload file for OCR">
                      <input
                        type="file"
                        accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => {
                          if (!checkLimit()) {
                            handleOpenUpgrade('Document OCR');
                            e.target.value = null;
                            return;
                          }
                          incrementUsage();
                          handleFileSelect(e);
                        }}
                        style={{ display: 'none' }}
                        disabled={loading}
                      />
                      <span className="bd-action-btn-icon" aria-hidden>
                        {loading ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="bd-spin">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </span>
                      <span className="bd-action-btn-text">Upload</span>
                    </label>
                  )}

                  {canEditBoardValue && (
                    <button
                      className="bd-action-btn"
                      title="Edit board details"
                      onClick={() => {
                        dispatchSet('editingBoard', true);
                        dispatchSet('boardDraft', { name: selectedBoard.name || '', description: selectedBoard.description || '' });
                        dispatchSet('showHeaderActions', false);
                      }}
                    >
                      <span className="bd-action-btn-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="bd-action-btn-text">Edit Board</span>
                    </button>
                  )}

                  {canDeleteBoard && (
                    <button
                      className="bd-action-btn bd-action-btn--danger"
                      title="Delete this board"
                      onClick={() => { handleDeleteBoard(selectedBoard.id); dispatchSet('showHeaderActions', false); }}
                    >
                      <span className="bd-action-btn-icon" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="bd-action-btn-text">Delete Board</span>
                    </button>
                  )}

                  {ocrResult && (
                    <>
                      <button
                        className="bd-action-btn bd-action-btn--accent"
                        title="Review and import OCR result"
                        onClick={() => { dispatchSet('ocrVerificationOpen', true); dispatchSet('showHeaderActions', false); }}
                        disabled={!canCreateList || !selectedBoardId || loading}
                      >
                        <span className="bd-action-btn-icon" aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="bd-action-btn-text">Verify & Import OCR</span>
                      </button>
                    </>
                  )}

                  {ocrError && (
                    <div className="bd-ocr-error-badge" title={ocrError}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      OCR Error
                    </div>
                  )}
                </>
              )}

              {/* AI Co-Pilot Toggle */}
              {canUseAI && selectedBoard && (
                <button
                  className={`bd-action-btn bd-action-btn--copilot ${copilotOpen ? 'active' : ''}`}
                  title="AI Co-Pilot"
                  onClick={() => { handleOpenCopilot(); dispatchSet('showHeaderActions', false); }}
                >
                  <span className="bd-action-btn-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                    </svg>
                  </span>
                  <span className="bd-action-btn-text">AI Co-Pilot</span>
                </button>
              )}
            </div>

            {/* User avatar */}
            {/* View switcher — Kanban / List */}
            {selectedBoard && (
              <div className="bd-view-switcher" title="Switch view">
                <button
                  className={`bd-view-btn ${(listViewMode || 'kanban') === 'kanban' ? 'active' : ''}`}
                  title="Kanban View"
                  onClick={() => dispatchSet('listViewMode', 'kanban')}
                  aria-label="Kanban view"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="4" height="14" rx="1" />
                    <rect x="6" y="1" width="4" height="10" rx="1" />
                    <rect x="11" y="1" width="4" height="12" rx="1" />
                  </svg>
                </button>
                <button
                  className={`bd-view-btn ${listViewMode === 'list' ? 'active' : ''}`}
                  title="List View"
                  onClick={() => dispatchSet('listViewMode', 'list')}
                  aria-label="List view"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="2" width="14" height="2.5" rx="1" />
                    <rect x="1" y="6.5" width="14" height="2.5" rx="1" />
                    <rect x="1" y="11" width="14" height="2.5" rx="1" />
                  </svg>
                </button>
                <button
                  className={`bd-view-btn ${listViewMode === 'calendar' ? 'active' : ''}`}
                  title="Calendar View (Pro)"
                  onClick={() => {
                    if (!canUseCalendar) {
                      handleOpenUpgrade('Calendar View');
                      return;
                    }
                    dispatchSet('listViewMode', 'calendar');
                  }}
                  aria-label="Calendar view"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            )}

            <div className="bd-user-chip" title={currentUser?.email || ''}>
              <div className="bd-chip-avatar">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="" />
                ) : (
                  <span>{currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {uiError && <div className="bd-uierror">{uiError}</div>}

        {/* OCR Preview Modal */}
        {previewFile && (
          <div className="ocr-preview-overlay">
            <div className="ocr-preview-modal">
              <h3 className="modal-title">Confirm Upload</h3>
              <p className="modal-desc">
                Please review the file before processing.<br />
                <strong>Security Warning:</strong> Ensure this does not contain sensitive data like passwords or API keys.
              </p>
              <div className="preview-container">
                {previewUrl && <img src={previewUrl} alt="Preview" className="preview-img" />}
              </div>
              <div className="modal-actions">
                <button className="bd-btn plain" onClick={cancelUpload}>Cancel</button>
                <button className="bd-btn primary" onClick={confirmUpload}>Confirm Upload</button>
              </div>
            </div>
          </div>
        )}

        {/* OCR Verification Modal */}
        {ocrVerificationOpen && ocrResult && (
          <div className="ocr-verify-overlay">
            <div className="ocr-verify-modal">
              <div className="ocr-verify-header">
                <div>
                  <h3 className="ocr-verify-title">Verify OCR Data</h3>
                  <p className="ocr-verify-subtitle">Review the extracted structure before importing to your board.</p>
                </div>
                <button
                  className="ocr-verify-close"
                  onClick={() => dispatchSet('ocrVerificationOpen', false)}
                  title="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="ocr-verify-body">
                {(ocrResult.lists || []).length === 0 ? (
                  <div className="ocr-verify-empty">No lists or tasks were found in the document.</div>
                ) : (
                  (ocrResult.lists || []).map((list, lIdx) => (
                    <div className="ocr-verify-list" key={lIdx}>
                      <h4 className="ocr-verify-list-name">
                        <span className="list-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="3" y="3" width="7" height="18" rx="1.5" />
                            <rect x="13" y="3" width="8" height="11" rx="1.5" opacity="0.7" />
                          </svg>
                        </span>
                        <input 
                          className="ocr-edit-input list-title-input" 
                          value={list.name || ''} 
                          onChange={(e) => updateOcrList(lIdx, 'name', e.target.value)} 
                          placeholder="Untitled List"
                        />
                        <span className="task-count">{list.items?.length || 0} tasks</span>
                      </h4>

                      <div className="ocr-verify-tasks">
                        {(list.items || []).map((item, tIdx) => (
                          <div className="ocr-verify-task" key={tIdx}>
                            <div className="task-header">
                              <input 
                                className="ocr-edit-input task-title-input" 
                                value={item.title || ''} 
                                onChange={(e) => updateOcrTask(lIdx, tIdx, 'title', e.target.value)} 
                                placeholder="Task Title"
                              />
                              <div className="task-badges">
                                <select 
                                  className={`ocr-edit-input task-badge priority-${(item.priorityScale || 'Medium').toLowerCase()}`} 
                                  value={item.priorityScale || 'Medium'} 
                                  onChange={(e) => updateOcrTask(lIdx, tIdx, 'priorityScale', e.target.value)}
                                >
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                                <span className="task-badge weight">
                                  P <input 
                                    type="number" 
                                    className="ocr-edit-input weight-input" 
                                    value={item.weight || 0} 
                                    onChange={(e) => updateOcrTask(lIdx, tIdx, 'weight', parseInt(e.target.value, 10))} 
                                  />
                                </span>
                              </div>
                            </div>
                            
                            <textarea 
                              className="ocr-edit-input task-desc-input" 
                              value={item.description || ''} 
                              onChange={(e) => updateOcrTask(lIdx, tIdx, 'description', e.target.value)} 
                              placeholder="Task Description"
                            />
                            
                            <div className="task-meta">
                              <span className="meta-item">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                Start: <input type="date" className="ocr-edit-input date-input" value={item.startDate || ''} onChange={(e) => updateOcrTask(lIdx, tIdx, 'startDate', e.target.value)} />
                              </span>
                              <span className="meta-item highlight-due">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                Due: <input type="date" className="ocr-edit-input date-input" min={new Date().toISOString().split('T')[0]} value={item.dueDate || ''} onChange={(e) => updateOcrTask(lIdx, tIdx, 'dueDate', e.target.value)} />
                              </span>
                              <span className="meta-item assignees-edit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                {(item.assignees || []).map(a => (
                                  <span className="assignee-pill" key={a}>
                                    {a} 
                                    <button type="button" onClick={() => removeOcrAssignee(lIdx, tIdx, item, a)}>&times;</button>
                                  </span>
                                ))}
                                <select 
                                  className="ocr-edit-input assignee-select" 
                                  value="" 
                                  onChange={(e) => addOcrAssignee(lIdx, tIdx, item, e.target.value)}
                                >
                                  <option value="" disabled>+ Assignee</option>
                                  {candidateEmails.filter(ce => !(item.assignees || []).includes(ce)).map(ce => (
                                    <option key={ce} value={ce}>{ce}</option>
                                  ))}
                                </select>
                              </span>
                            </div>

                            {Array.isArray(item.subtasks) && item.subtasks.length > 0 && (
                              <div className="task-subtasks">
                                {item.subtasks.map((st, sIdx) => (
                                  <div className="subtask-row" key={sIdx}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!st.completed} 
                                      onChange={(e) => updateOcrSubtask(lIdx, tIdx, sIdx, 'completed', e.target.checked)} 
                                    />
                                    <input 
                                      type="text" 
                                      className={`ocr-edit-input subtask-text ${st.completed ? 'completed' : ''}`} 
                                      value={st.text || ''} 
                                      onChange={(e) => updateOcrSubtask(lIdx, tIdx, sIdx, 'text', e.target.value)} 
                                    />
                                    <span className="subtask-weight">
                                      <input 
                                        type="number" 
                                        className="ocr-edit-input weight-input" 
                                        value={st.weight || 0} 
                                        onChange={(e) => updateOcrSubtask(lIdx, tIdx, sIdx, 'weight', parseInt(e.target.value, 10))} 
                                      />%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="ocr-verify-footer">
                <button
                  className="action-btn danger"
                  onClick={() => {
                    dispatchSet('ocrRaw', null);
                    dispatchSet('ocrResult', null);
                    dispatchSet('ocrError', null);
                    dispatchSet('ocrVerificationOpen', false);
                  }}
                >
                  Clear & Reset
                </button>
                <div className="footer-right">
                  <button
                    className="action-btn"
                    onClick={() => dispatchSet('ocrVerificationOpen', false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="action-btn primary pulse"
                    onClick={() => {
                      dispatchSet('ocrVerificationOpen', false);
                      handleApplyOCRToBoard();
                    }}
                    disabled={loading || !canCreateList || !selectedBoardId}
                  >
                    {loading ? 'Importing...' : 'Confirm & Import to Board'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Verification Modal */}
        {aiVerificationOpen && aiResult && (
          <div className="ocr-verify-overlay" style={{ zIndex: 9999 }}>
            <div className="ocr-verify-modal">
              <div className="ocr-verify-header">
                <div>
                  <h3 className="ocr-verify-title">Verify Generated Board</h3>
                  <p className="ocr-verify-subtitle">Review the AI generated lists and tasks before creating your new board.</p>
                </div>
                <button
                  className="ocr-verify-close"
                  onClick={() => dispatchSet('aiVerificationOpen', false)}
                  title="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="ocr-verify-body">
                <div style={{ marginBottom: '1.5rem', background: 'var(--bd-bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--bd-border-subtle)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--bd-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Board Name</label>
                  <input 
                    className="ocr-edit-input" 
                    value={aiResult.boardName || ''} 
                    onChange={(e) => updateAIBoardName(e.target.value)} 
                    placeholder="Board Name"
                    style={{ width: '100%', fontSize: '1rem', padding: '0.5rem', fontWeight: 600 }}
                  />
                </div>

                {(aiResult.lists || []).length === 0 ? (
                  <div className="ocr-verify-empty">No lists or tasks were generated.</div>
                ) : (
                  (aiResult.lists || []).map((list, lIdx) => {
                    const isExpanded = !aiExpandedLists[lIdx]; // Default expanded
                    return (
                    <div className="ocr-verify-list" key={lIdx}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: isExpanded ? '1rem' : 0 }}>
                        <button 
                          onClick={() => toggleAIListExpand(lIdx)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--bd-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <h4 className="ocr-verify-list-name" style={{ margin: 0, flex: 1, paddingBottom: 0, borderBottom: 'none' }}>
                          <span className="list-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="3" y="3" width="7" height="18" rx="1.5" />
                              <rect x="13" y="3" width="8" height="11" rx="1.5" opacity="0.7" />
                            </svg>
                          </span>
                          <input 
                            className="ocr-edit-input list-title-input" 
                            value={list.name || ''} 
                            onChange={(e) => updateAIList(lIdx, 'name', e.target.value)} 
                            placeholder="List Name"
                          />
                          <span className="task-count">{list.cards?.length || 0} tasks</span>
                        </h4>
                      </div>

                      {isExpanded && (
                      <div className="ocr-verify-tasks">
                        {(list.cards || []).map((card, cIdx) => (
                          <div className="ocr-verify-task" key={cIdx}>
                            <div className="task-header">
                              <input 
                                className="ocr-edit-input task-title-input" 
                                value={card.title || ''} 
                                onChange={(e) => updateAICard(lIdx, cIdx, 'title', e.target.value)} 
                                placeholder="Task Title"
                              />
                              <div className="task-badges">
                                <select 
                                  className={`ocr-edit-input task-badge priority-${(card.priorityScale || 'Medium').toLowerCase()}`} 
                                  value={card.priorityScale || 'Medium'} 
                                  onChange={(e) => updateAICard(lIdx, cIdx, 'priorityScale', e.target.value)}
                                >
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                                <span className="task-badge weight">
                                  Effort <input 
                                    type="number" 
                                    className="ocr-edit-input weight-input" 
                                    value={card.effort || 0} 
                                    onChange={(e) => updateAICard(lIdx, cIdx, 'effort', parseInt(e.target.value, 10))} 
                                  />
                                </span>
                                <span className="task-badge date">
                                  Start <input 
                                    type="date" 
                                    className="ocr-edit-input date-input" 
                                    value={card.startDate || ''} 
                                    onChange={(e) => updateAICard(lIdx, cIdx, 'startDate', e.target.value)} 
                                  />
                                </span>
                                <span className="task-badge date">
                                  Due <input 
                                    type="date" 
                                    className="ocr-edit-input date-input" 
                                    value={card.dueDate || ''} 
                                    onChange={(e) => updateAICard(lIdx, cIdx, 'dueDate', e.target.value)} 
                                  />
                                </span>
                              </div>
                            </div>
                            
                            <textarea 
                              className="ocr-edit-input task-desc-input" 
                              value={card.description || ''} 
                              onChange={(e) => updateAICard(lIdx, cIdx, 'description', e.target.value)} 
                              placeholder="Task Description"
                            />
                            
                            <div className="task-meta">
                              <span className="meta-item assignees-edit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                {(card.assignees || []).map(a => (
                                  <span className="assignee-pill" key={a}>
                                    {a} 
                                    <button type="button" onClick={() => removeAIAssignee(lIdx, cIdx, card, a)}>&times;</button>
                                  </span>
                                ))}
                                <select 
                                  className="ocr-edit-input assignee-select" 
                                  value="" 
                                  onChange={(e) => addAIAssignee(lIdx, cIdx, card, e.target.value)}
                                >
                                  <option value="" disabled>+ Assignee</option>
                                  {(members || [])
                                    .filter(m => String(m.uid) !== String(businessOwnerUid))
                                    .map(m => m.email)
                                    .filter(Boolean)
                                    .filter(ce => !(card.assignees || []).includes(ce))
                                    .map(ce => (
                                    <option key={ce} value={ce}>{ce}</option>
                                  ))}
                                </select>
                              </span>
                            </div>

                            {Array.isArray(card.subtasks) && card.subtasks.length > 0 && (
                              <div className="task-subtasks">
                                {card.subtasks.map((st, sIdx) => (
                                  <div className="subtask-row" key={sIdx}>
                                    <input 
                                      type="checkbox" 
                                      checked={!!st.completed} 
                                      onChange={(e) => updateAISubtask(lIdx, cIdx, sIdx, 'completed', e.target.checked)} 
                                    />
                                    <input 
                                      type="text" 
                                      className={`ocr-edit-input subtask-text ${st.completed ? 'completed' : ''}`} 
                                      value={st.text || ''} 
                                      onChange={(e) => updateAISubtask(lIdx, cIdx, sIdx, 'text', e.target.value)} 
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>

              <div className="ocr-verify-footer">
                <button
                  className="action-btn danger"
                  onClick={() => Object.keys(aiExpandedLists).length < (aiResult.lists?.length || 0) 
                    ? setAiExpandedLists(aiResult.lists.reduce((acc, _, i) => ({...acc, [i]: true}), {})) 
                    : setAiExpandedLists({})}
                >
                  {Object.keys(aiExpandedLists).length < (aiResult.lists?.length || 0) ? "Collapse All Lists" : "Expand All Lists"}
                </button>
                <div className="footer-right">
                  <button
                    className="action-btn"
                    onClick={() => dispatchSet('aiVerificationOpen', false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="action-btn primary pulse"
                    onClick={() => {
                      handleApplyAIToBoard(aiResult);
                    }}
                    disabled={aiApplying}
                  >
                    {aiApplying ? 'Importing...' : 'Confirm & Create Board'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} featureName={upgradeFeatureName} />

        {/* Board content area */}
        <div className="bd-board-area">
          {!selectedBoard ? (
            <div className="bd-empty-state">
              <div className="bd-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                  <rect x="13" y="3" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                </svg>
              </div>
              <p className="bd-empty-text">
                {!canViewBoards ? 'You do not have access to any boards.' : 'Select a board from the sidebar to get started.'}
              </p>
            </div>
          ) : (
            <>
              <BoardTop
                selectedBoard={selectedBoard}
                editingBoard={editingBoard}
                setEditingBoard={(v) => dispatchSet('editingBoard', v)}
                boardDraft={boardDraft}
                setBoardDraft={(d) => dispatchSet('boardDraft', d)}
                handleUpdateBoard={handleUpdateBoard}
                handleRefreshBoard={handleRefreshBoard}
                canEditBoardValue={canEditBoardValue}
              />

                {listViewMode === 'list' ? (
                  /* ── LIST VIEW ── full CardItem rendering grouped by list */
                  (() => {
                    const LIST_COLORS = [
                      '#538fff', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'
                    ];
                    const allEmpty = listsVisible.every(l => (filteredCardsMap[l.id] || []).length === 0);
                    if (allEmpty) {
                      return <div className="bd-listview-empty">No tasks found in this board.</div>;
                    }
                    return (
                      <div className="bd-listview-layout">
                        {listsVisible.map((l, li) => {
                          const myCards = filteredCardsMap[l.id] || [];
                          const totalCards = cardsMap[l.id] || [];
                          if (myCards.length === 0) return null;
                          const listColor = LIST_COLORS[li % LIST_COLORS.length];
                          return (
                            <div key={l.id} className="bd-listview-group">
                              <div className="bd-listview-group-header">
                                <span className="bd-lv-dot" style={{ background: listColor }} />
                                <span className="bd-lv-group-name">{l.name}</span>
                                <span className="bd-lv-count">{totalCards.length}</span>

                                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                                  {loadMoreCards && cardsHasMoreMap[l.id] && (
                                    <button
                                      className="bd-btn bd-btn--small"
                                      style={{ backgroundColor: "#2d3748", color: "#e2e8f0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                      onClick={() => loadMoreCards(l.id)}
                                    >
                                      ↓ Load More
                                    </button>
                                  )}
                                  {resetLimitCards && (cardsLimitsMap[l.id] || cardsBaseLimit) > cardsBaseLimit && (
                                    <button
                                      className="bd-btn bd-btn--small"
                                      style={{ backgroundColor: "transparent", color: "#a0aec0", border: "1px solid #4a5568", fontSize: "0.75rem", padding: "4px 8px" }}
                                      onClick={() => resetLimitCards(l.id)}
                                    >
                                      ↑ Show Less
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Cards with FULL interaction — Details, Submit, Review modals all included */}
                              <div className="bd-listview-cards-grid">
                                {myCards.map(card => (
                                  <CardItem
                                    key={card.id}
                                    card={card}
                                    listId={l.id}
                                    viewMode="row"
                                    listColor={listColor}
                                    listName={l.name}
                                    cardDrafts={cardDrafts}
                                    setCardDrafts={(p) => dispatchSet('cardDrafts', p)}
                                    handleUpdateCard={handleUpdateCard}
                                    handleDeleteCard={handleDeleteCard}
                                    handleSubmitCard={handleSubmitCard}
                                    handleReviewAction={handleReviewAction}
                                    canEdit={canEditBoardValue}
                                    membersMap={membersMap}
                                    emailMap={emailMap}
                                    businessOwnerUid={businessOwnerUid}
                                    currentUserUid={uid}
                                    currentUserEmail={userEmail}
                                    reviewerOptions={reviewerOptions}
                                    highlightColor={highlightCardIds.has(card.id) ? highlightColor : undefined}
                                    listAssignees={l.assignees}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : listViewMode === 'calendar' ? (
                  /* ── CALENDAR VIEW ── */
                  <BoardCalendar
                    lists={listsVisible}
                    cardsMap={filteredCardsMap}
                    membersMap={membersMap}
                    emailMap={emailMap}
                    businessOwnerUid={businessOwnerUid}
                    currentUserUid={uid}
                    currentUserEmail={userEmail}
                    handleUpdateCard={handleUpdateCard}
                    handleDeleteCard={handleDeleteCard}
                    handleSubmitCard={handleSubmitCard}
                    handleReviewAction={handleReviewAction}
                    canEdit={canEditBoardValue}
                    reviewerOptions={reviewerOptions}
                    loadMoreCards={loadMoreCards}
                    cardsHasMoreMap={cardsHasMoreMap}
                    highlightCardIds={highlightCardIds}
                    highlightColor={highlightColor}
                  />
                ) : (
                /* ── KANBAN VIEW (default) ── */
                <div className="lists-wrap">
                  {listsVisible.map((l) => (
                    <ListColumn
                      key={l.id}
                      boardId={selectedBoardId}
                      list={l}
                      lists={lists}
                      cards={filteredCardsMap[l.id] || []}
                      allCards={cardsMap[l.id] || []}
                      listNameEditing={listNameEditing}
                      listNameDrafts={listNameDrafts}
                      setListNameDrafts={(p) => dispatchSet('listNameDrafts', p)}
                      setListNameEditing={(p) => dispatchSet('listNameEditing', p)}
                      handleUpdateList={handleUpdateList}
                      handleDeleteList={handleDeleteList}
                      canEdit={canEditBoardValue}
                      canUpdateList={canUpdateList}
                      canDeleteList={canDeleteList}
                      canCreateCard={canCreateCard}
                      cardEditing={cardEditing}
                      cardDrafts={cardDrafts}
                      setCardDrafts={(p) => dispatchSet('cardDrafts', p)}
                      setCardEditing={(p) => dispatchSet('cardEditing', p)}
                      handleUpdateCard={handleUpdateCard}
                      handleMoveCard={handleMoveCard}
                      handleDeleteCard={handleDeleteCard}
                      handleSubmitCard={handleSubmitCard}
                      handleReviewAction={handleReviewAction}
                      newCardInputs={newCardInputs}
                      setNewCardInputs={(p) => dispatchSet('newCardInputs', p)}
                      handleCreateCardForList={handleCreateCardForList}
                      currentUserUid={uid}
                      currentUserEmail={userEmail}
                      members={members}
                      membersMap={membersMap}
                      emailMap={emailMap}
                      reviewerOptions={reviewerOptions}
                      reviewerOptionsSource="higher"
                      roles={roles}
                      workloadMap={workloadMap}
                      isOverloaded={isOverloaded}
                      businessOwnerUid={businessOwnerUid}
                      highlightCardIds={highlightCardIds}
                      highlightColor={highlightColor}
                      loadMoreCards={loadMoreCards}
                      resetLimitCards={resetLimitCards}
                      cardsHasMoreMap={cardsHasMoreMap}
                      cardsLimitsMap={cardsLimitsMap || {}}
                      cardsBaseLimit={cardsBaseLimit || 3}
                    />
                  ))}

                  {canCreateList && (
                    <div className="list-col add-list">
                      <div className="add-list-head">Add list</div>
                            <input
                              className="add-list-name-input"
                              value={newListName}
                              onChange={(e) => dispatchSet('newListName', e.target.value)}
                              placeholder="New list name"
                            />
                            <div className="assignee-search-wrapper" ref={assigneeRef}>
                        <input
                          placeholder="Search members to assign..."
                          value={assigneeSearch}
                          onChange={(e) => { dispatchSet('assigneeSearch', e.target.value); dispatchSet('assigneeDropdownOpen', true); }}
                          onFocus={() => dispatchSet('assigneeDropdownOpen', true)}
                                className="add-list-assignee-input"
                          aria-expanded={assigneeDropdownOpen}
                          aria-haspopup="listbox"
                        />
                        {assigneeDropdownOpen && (
                                <div className="add-list-dropdown" role="listbox">
                            {assigneeCandidates.length === 0 ? (
                                    <div className="add-list-no-members">No members found</div>
                                  ) : assigneeCandidates.map((cand) => {
                                    const key = cand.id || cand.email;
                                    const value = (cand.email || '').toLowerCase();
                                    const checked = newListAssignees.includes(value);
                                    return (
                                      <div
                                        key={String(key)}
                                        className="add-list-dropdown-item"
                                        role="option"
                                        aria-selected={checked}
                                        onClick={() => {
                                          toggleAssignee(value);
                                          dispatchSet('assigneeSearch', '');
                                          dispatchSet('assigneeDropdownOpen', false);
                                        }}
                                      >
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                          <div className="assignee-avatar-small">
                                            {(cand.name || cand.email || '').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                                          </div>
                                          <div className="assignee-info">
                                            <div className="assignee-name">{cand.name || cand.email}</div>
                                            <div className="assignee-email">{cand.email}</div>
                                          </div>
                                        </div>
                                        <div>
                                          <input type="checkbox" readOnly checked={checked} />
                                        </div>
                                      </div>
                                    );
                                  })}
                          </div>
                        )}
                      </div>

                            <div className="selected-assignees-container">
                        {newListAssignees.map(a => {
                          const label = (a && a.includes('@')) ? a : (membersMap[a] ? (membersMap[a].email || membersMap[a].name || a) : a);
                          return (
                            <div key={String(a)} className="assignee-pill">
                              <span className="assignee-pill-label">{label}</span>
                              <button onClick={() => removeAssignee(a)} className="assignee-remove-btn">✕</button>
                            </div>
                          );
                        })}
                      </div>

                            <button onClick={handleCreateList} className="create-list-btn">Create list</button>
                    </div>
                        )}
                </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* AI Co-Pilot Panel */}
      <AICopilotPanel
        open={copilotOpen}
        onClose={() => dispatchSet('copilotOpen', false)}
        messages={copilot.messages}
        isThinking={copilot.isThinking}
        error={copilot.error}
        onSendMessage={copilot.sendMessage}
        onExecuteAction={copilot.executeAction}
        onClearHistory={copilot.clearHistory}
        boardName={selectedBoard?.name || 'Board'}
        remainingUses={getRemainingUses()}
        maxUses={maxUses}
        isPremium={isPremium}
        onUpgrade={() => handleOpenUpgrade('AI Co-Pilot')}
      />
    </div>
  );
}