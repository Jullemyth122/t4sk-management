// src/pages/BusinessDashboard.jsx
import { useEffect, useMemo, useRef, useCallback, useReducer } from 'react';
import { useAuth } from '../context/useAuth';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as boardSvc from '../services/boardService';
import * as accountSvc from '../services/accountService';
import { computePriority } from '../utils/prioritization';
import usePagination from '../hooks/usePagination';
import useCardsSubscriptions from '../hooks/useCardsSubscriptions';
import useMounted from '../hooks/useMounted';
import BoardSidebar from './Bcomponent/BoardSidebar';
import MembersPanel from './Bcomponent/MembersPanel';
import BoardTop from './Bcomponent/BoardTop';
import ListColumn from './Bcomponent/ListColumn';
import '../scss/business-dashboard.scss';

import {
  clampInt,
  normalizeToTargetSum,
  inferDueDateFromItem,
  tryParseEmbeddedJson,
  parseISODateToDate
} from '../utils/dashboardUtils';

// NEW: import the OCR service
import { processImageForTasks } from '../config/ocr';


// initialState (added OCR fields + loading)

const initialState = {
  businessId: null,
  businessName: null,
  businessOwnerUid: null,

  boards: [],
  selectedBoardId: null,

  lists: [],
  cardsMap: {},

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
  showHeaderActions: false
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_KEYS':
      return { ...state, ...action.payload };
    case 'SET_KEY': {
      const { key, value } = action.payload;
      const newVal = (typeof value === 'function') ? value(state[key]) : value;
      return { ...state, [key]: newVal };
    }
    default:
      return state;
  }
}

export default function BusinessDashboard({ businessId: propBusinessId = null }) {
  const authCtx = useAuth();
  const currentUser = authCtx?.currentUser || null;
  const profile = authCtx?.profile ?? currentUser?.profile ?? null;
  const uid = currentUser?.uid || profile?.uid || null;
  const userEmail = (currentUser?.email || profile?.email || '').toLowerCase();

  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    businessId: propBusinessId || initialState.businessId
  });

  const mountedRef = useMounted();
  const snapshotRef = useRef({});
  const assigneeRef = useRef(null);
  const copyTimeoutRef = useRef(0);

  // helper: set key with functional update allowed
  const dispatchSet = useCallback((key, valueOrFn) => {
    dispatch({ type: 'SET_KEY', payload: { key, value: valueOrFn } });
  }, []);

  // destructure for convenience (including new OCR fields)
  const {
    businessId,
    businessName,
    businessOwnerUid,
    boards,
    selectedBoardId,
    lists,
    cardsMap,
    roles,
    members,
    membersLoading,
    membersError,
    uiError,
    boardQuery,
    boardView,
    memberQuery,
    editingBoard,
    boardDraft,
    newBoardName,
    newListName,
    newListAssignees,
    assigneeSearch,
    assigneeDropdownOpen,
    listNameEditing,
    listNameDrafts,
    cardEditing,
    cardDrafts,
    newCardInputs,
    copiedEmailId,

    // OCR fields
    loading,
    ocrRaw,
    ocrResult,
    ocrError,
    showHeaderActions
  } = state;

  // close assignee dropdown on outside click / escape
  useEffect(() => {
    const handleDocClick = (e) => {
      if (!assigneeRef.current) return;
      if (!assigneeRef.current.contains(e.target)) {
        dispatchSet('assigneeDropdownOpen', false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        dispatchSet('assigneeDropdownOpen', false);
      }
    };

    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('touchstart', handleDocClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('touchstart', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dispatchSet]);

  // boards filtered by query
  const boardsFiltered = useMemo(() => {
    if (!boardQuery) return boards || [];
    const q = boardQuery.toLowerCase();
    return (boards || []).filter((b) => (((b.name || '') + ' ' + (b.description || '')).toLowerCase().includes(q)));
  }, [boards, boardQuery]);

  const {
    page: boardPage,
    perPage: boardsPerPage,
    setPerPage: setBoardsPerPage,
    totalPages: boardsTotalPages,
    visible: visibleBoards,
    goto: gotoBoardPage,
    setPage: setBoardPage
  } = usePagination(boardsFiltered, 6);

  const getMemberLevel = useCallback((m, rolesList = roles) => {
    if (typeof m.level === 'number') return m.level;
    const roleFromList = (rolesList || roles).find((r) => r.id === m.roleId || r.name === m.roleName);
    if (roleFromList && typeof roleFromList.level === 'number') return roleFromList.level;
    if (roleFromList && typeof roleFromList.priority === 'number') return roleFromList.priority;
    return 0;
  }, [roles]);

  const membersFiltered = useMemo(() => {
    const q = (memberQuery || '').toLowerCase();
    const filtered = (members || []).filter((m) => {
      if (!q) return true;
      const roleFromList = roles.find((r) => r.id === m.roleId);
      const resolvedRoleName = (m.roleName || (roleFromList ? roleFromList.name : '') || '').toLowerCase();
      return ((m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q) || resolvedRoleName.includes(q));
    });
    filtered.sort((a, b) => {
      const la = getMemberLevel(a, roles);
      const lb = getMemberLevel(b, roles);
      if (lb !== la) return lb - la;
      return (a.name || '').localeCompare(b.name || '');
    });
    return filtered;
  }, [members, memberQuery, roles, getMemberLevel]);

  const {
    page: memberPage,
    perPage: membersPerPage,
    setPerPage: setMembersPerPage,
    totalPages: membersTotalPages,
    visible: visibleMembers,
    goto: gotoMemberPage
  } = usePagination(membersFiltered, 6);

  const userRoleId = useMemo(() => {
    if (!profile || !Array.isArray(profile.businessAffiliations) || !businessId) return null;
    const a = profile.businessAffiliations.find((x) => x.businessId === businessId);
    return a ? a.roleId : null;
  }, [profile, businessId]);

  const userRoleName = useMemo(() => {
    if (!userRoleId) return null;
    if (userRoleId === 'owner') return 'Owner';
    const rDoc = roles.find((r) => r.id === userRoleId);
    return rDoc ? rDoc.name || rDoc.id : userRoleId;
  }, [userRoleId, roles]);

  const canEditBoardValue = useMemo(() => {
    if (!userRoleId) return false;
    if (userRoleId === 'owner') return true;
    const r = roles.find((rr) => rr.id === userRoleId);
    if (!r) return false;
    return Number(r.level || 0) >= 5;
  }, [userRoleId, roles]);

  const userLevel = useMemo(() => {
    if (!userRoleId) return 0;
    if (userRoleId === 'owner') return 999;
    const r = roles.find((rr) => rr.id === userRoleId || rr.name === userRoleId);
    return r ? Number(r.level || 0) : 0;
  }, [userRoleId, roles]);

  const canCreateBoard = useMemo(() => (userRoleId === 'owner') ? true : (userLevel >= 2), [userRoleId, userLevel]);
  const canCreateList = useMemo(() => (userRoleId === 'owner') ? true : (userLevel >= 2), [userRoleId, userLevel]);
  const canViewMembers = useMemo(() => (userRoleId === 'owner') ? true : (userLevel >= 2), [userRoleId, userLevel]);
  const canAssignTasks = useMemo(() => (userRoleId === 'owner') ? true : (userLevel > 2), [userRoleId, userLevel]);

  // derive businessId from profile if not provided
  useEffect(() => {
    if (propBusinessId) { dispatchSet('businessId', propBusinessId); return; }
    const derive = (p) => {
      if (!p || !Array.isArray(p.businessAffiliations) || p.businessAffiliations.length === 0) return null;
      const primary = p.businessAffiliations.find((a) => a.isPrimary) || p.businessAffiliations[0];
      return primary?.businessId || null;
    };
    const fromProfile = derive(profile);
    if (fromProfile) { dispatchSet('businessId', fromProfile); return; }
    (async () => {
      try {
        if (!uid) return;
        const acct = await accountSvc.fetchAccountProfile(uid);
        if (!mountedRef.current) return;
        const fromAcct = derive(acct);
        if (fromAcct) dispatchSet('businessId', fromAcct);
      } catch (err) {
        console.warn('BusinessDashboard: account fallback read failed', err);
      }
    })();
  }, [propBusinessId, profile, uid, dispatchSet]);

  // load business name
  useEffect(() => {
    if (!businessId) { dispatchSet('businessName', null); dispatchSet('businessOwnerUid', null); return; }
    let mounted = true;
    (async () => {
      try {
        const biz = await accountSvc.getBusiness(businessId);
        if (!mounted) return;
        dispatchSet('businessName', biz?.name || null);
        dispatchSet('businessOwnerUid', biz?.ownerUid || null);
      } catch (err) {
        console.warn('Failed to load business', err);
        if (mounted) {
          dispatchSet('businessName', null);
          dispatchSet('businessOwnerUid', null);
        }
      }
    })();
    return () => { mounted = false; };
  }, [businessId, dispatchSet]);

  // roles & members
  useEffect(() => {
    if (!businessId) {
      dispatchSet('roles', []);
      dispatchSet('members', []);
      dispatchSet('membersLoading', false);
      dispatchSet('membersError', null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await accountSvc.getRoles(businessId);
        if (cancelled) return;
        dispatchSet('roles', r || []);
      } catch (err) {
        console.warn('getRoles failed', err);
        if (!cancelled) dispatchSet('roles', []);
      }

      try {
        dispatchSet('membersLoading', true);
        const m = await accountSvc.getBusinessMembers(businessId);
        if (cancelled) return;
        dispatchSet('members', m || []);
      } catch (err) {
        console.warn('getBusinessMembers failed', err);
        if (!cancelled) {
          dispatchSet('members', []);
          dispatchSet('membersError', err.message || 'Error loading members');
        }
      } finally {
        if (!cancelled) dispatchSet('membersLoading', false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, dispatchSet]);

  // If business has ownerUid but owner isn't present in members array,
  // fetch the owner's account profile and inject a member-shaped fallback.
  useEffect(() => {
    if (!businessOwnerUid) return;
    // If members already include owner (by uid), nothing to do
    const found = (members || []).some(m => {
      const key = m.uid || m.id || null;
      return key && String(key) === String(businessOwnerUid);
    });
    if (found) return;

    // otherwise fetch the owner account profile and merge in
    (async () => {
      try {
        const ownerProfile = await accountSvc.fetchAccountProfile(businessOwnerUid);
        if (!ownerProfile) return;
        // Build a member-shaped object consistent with getBusinessMembers output
        const ownerMember = {
          id: ownerProfile.uid || ownerProfile.id || businessOwnerUid,
          uid: ownerProfile.uid || ownerProfile.id || businessOwnerUid,
          email: ownerProfile.email || null,
          name: ownerProfile.username || ownerProfile.name || ownerProfile.email || 'Owner',
          roleId: 'owner'
        };
        // Add owner at top so reviewerOptions picks them up and shows as owner
        dispatchSet('members', (prev) => {
          // don't double-add if race happened
          if ((prev || []).some(m => String(m.uid || m.id) === String(businessOwnerUid))) return prev;
          return [ownerMember, ...(prev || [])];
        });
      } catch (err) {
        console.warn('failed to fetch owner profile for reviewer fallback', err);
      }
    })();
  }, [businessOwnerUid, members, dispatchSet]);

  const reviewerOptions = useMemo(() => {
    if (!Array.isArray(members) || members.length === 0) return null;
    const opts = [];
    const seen = new Set();

    members.forEach((m) => {
      const mUid = m.uid || m.id || null;
      const mEmail = m.email ? String(m.email).toLowerCase() : null;
      const level = getMemberLevel(m);
      const isOwner = businessOwnerUid && mUid && String(mUid) === String(businessOwnerUid);

      // include if owner OR level > 2
      if (!isOwner && !(typeof level === 'number' && level > 2)) return;

      // determine value (prefer uid, else email)
      const val = mUid || mEmail;
      if (!val) return;
      if (seen.has(String(val))) return;
      seen.add(String(val));

      // resolve role doc/name
      const roleDoc = roles.find((r) => r.id === m.roleId || r.name === m.roleId || r.id === m.roleName || r.name === m.roleName);
      const roleLabel = m.roleName || (roleDoc ? roleDoc.name : m.roleId) || '';
      const levelNum = isOwner ? 999 : (typeof level === 'number' ? level : 0);

      opts.push({
        value: val,
        label: m.name || m.email || String(val),
        subtitle: roleLabel || '',
        level: levelNum,
        owner: !!isOwner
      });
    });

    // add explicit none option first
    opts.sort((a, b) => {
      if ((b.level || 0) !== (a.level || 0)) return (b.level || 0) - (a.level || 0); // desc level
      return (a.label || '').localeCompare(b.label || '');
    });

    // ensure 'none' entry at start
    return [{ value: '', label: '— none —', subtitle: '' }, ...opts];
  }, [members, roles, businessOwnerUid, getMemberLevel]);

  // subscribe to boards
  useEffect(() => {
    if (!businessId) { dispatchSet('boards', []); return; }
    const unsub = boardSvc.subscribeBoards({ businessId, uid: null, cb: (b) => dispatchSet('boards', b || []) });
    return () => unsub && unsub();
  }, [businessId, dispatchSet]);

  // if low-level user (<=2): auto-select first board when boards arrive
  useEffect(() => {
    if (!boards || boards.length === 0) return;
    if ((userLevel <= 2) && !selectedBoardId) {
      dispatchSet('selectedBoardId', boards[0].id);
    }
  }, [boards, userLevel, selectedBoardId, dispatchSet]);

  // keep selectedBoardId valid when boards change
  useEffect(() => {
    if (!selectedBoardId) return;
    const found = boards.find((b) => b.id === selectedBoardId);
    if (!found) dispatchSet('selectedBoardId', null);
  }, [boards, selectedBoardId, dispatchSet]);

  // subscribe lists for selected board
  useEffect(() => {
    dispatchSet('lists', []);
    dispatchSet('cardsMap', {});
    if (!selectedBoardId) return;
    const unsubLists = boardSvc.subscribeLists({ businessId, uid: null, boardId: selectedBoardId, cb: (ls) => dispatchSet('lists', ls || []) });
    return () => unsubLists && unsubLists();
  }, [businessId, selectedBoardId, dispatchSet]);

  // cards subscriptions (diffing) - hook expects a setter; provide function that delegates to reducer
  const setCardsMapForHook = useCallback((valueOrFn) => {
    dispatchSet('cardsMap', (prev) => (typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn));
  }, [dispatchSet]);
  useCardsSubscriptions({ businessId, boardId: selectedBoardId, lists, setCardsMap: setCardsMapForHook });

  // members/email maps
  const membersMap = useMemo(() => {
    const m = {};
    (members || []).forEach((mm) => {
      const keyUid = mm.uid || mm.id || null;
      if (keyUid) m[String(keyUid)] = mm;
    });
    return m;
  }, [members]);

  const emailMap = useMemo(() => {
    const e = {};
    (members || []).forEach((mm) => {
      if (mm.email) e[String(mm.email).toLowerCase()] = mm;
    });
    return e;
  }, [members]);

  // lists visibility for low-level users
  const listsVisible = useMemo(() => {
    if (!Array.isArray(lists)) return [];
    if (userLevel <= 2) {
      return lists.filter(l => {
        const a = Array.isArray(l.assignees) ? l.assignees : [];
        return a.some(x => {
          if (!x) return false;
          const s = String(x).trim();
          return (s === uid) || (s.toLowerCase() === userEmail);
        });
      });
    }
    return lists;
  }, [lists, userLevel, uid, userEmail]);

  const copyEmail = useCallback(async (id, email) => {
    try {
      await navigator.clipboard.writeText(email || '');
      dispatchSet('copiedEmailId', id);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => dispatchSet('copiedEmailId', null), 1800);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  }, [dispatchSet]);

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId) || null, [boards, selectedBoardId]);

  // service handlers (wrapped primarily to use dispatchSet)
  const handleRefreshBoard = useCallback(async (boardIdArg) => {
    if (!boardIdArg) return;
    try {
      const b = await boardSvc.getBoard({ businessId, uid: null, boardId: boardIdArg });
      if (b) dispatchSet('boards', (prev) => prev.map((x) => x.id === b.id ? b : x));
    } catch (err) {
      console.warn('getBoard failed', err);
      dispatchSet('uiError', err?.message || 'Failed to refresh board');
    }
  }, [businessId, dispatchSet]);

  const handleUpdateBoard = useCallback(async (boardIdArg, updates) => {
    if (!boardIdArg) return dispatchSet('uiError', 'Board required');
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    dispatchSet('uiError', '');
    snapshotRef.current.boards = boards;
    try {
      await boardSvc.updateBoard({ businessId, uid, boardId: boardIdArg, updates });
      dispatchSet('boards', (prev) => prev.map((b) => (b.id === boardIdArg ? { ...b, ...updates } : b)));
      dispatchSet('editingBoard', false);
    } catch (err) {
      console.error('updateBoard failed', err);
      dispatchSet('boards', snapshotRef.current.boards || []);
      dispatchSet('uiError', err?.message || 'Failed to update board');
    }
  }, [businessId, uid, boards, canEditBoardValue, dispatchSet]);

  const handleDeleteBoard = useCallback(async (boardIdArg) => {
    if (!boardIdArg) return;
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    if (!window.confirm('Delete board and all lists/cards? This action cannot be undone.')) return;
    dispatchSet('uiError', '');
    snapshotRef.current.boards = boards;
    try {
      await boardSvc.deleteBoard({ businessId, uid, boardId: boardIdArg });
      dispatchSet('boards', (prev) => prev.filter((b) => b.id !== boardIdArg));
      if (selectedBoardId === boardIdArg) dispatchSet('selectedBoardId', null);
    } catch (err) {
      console.error('deleteBoard failed', err);
      dispatchSet('boards', snapshotRef.current.boards || []);
      dispatchSet('uiError', err?.message || 'Failed to delete board');
    }
  }, [businessId, uid, boards, canEditBoardValue, selectedBoardId, dispatchSet]);

  const handleCreateBoard = useCallback(async () => {
    dispatchSet('uiError', '');
    if (!newBoardName) return dispatchSet('uiError', 'Board name required');
    if (!businessId) return dispatchSet('uiError', 'No business affiliation');
    snapshotRef.current.boards = boards;
    const tempId = `tmp-board-${Date.now()}`;
    dispatchSet('boards', (prev) => [{ id: tempId, name: newBoardName, description: '(creating...)' }, ...prev]);
    try {
      const created = await boardSvc.createBoard({ businessId, uid, name: newBoardName, description: '' });
      dispatchSet('boards', (prev) => prev.map((b) => (b.id === tempId ? created : b)));
      dispatchSet('newBoardName', '');
    } catch (err) {
      console.error('createBoard failed', err);
      dispatchSet('boards', snapshotRef.current.boards || []);
      dispatchSet('uiError', err?.message || 'Failed to create board');
    }
  }, [newBoardName, businessId, uid, boards, dispatchSet]);

  const handleCreateList = useCallback(async () => {
    dispatchSet('uiError', '');
    if (!canCreateList) return dispatchSet('uiError', 'Permission denied');
    if (!newListName) return dispatchSet('uiError', 'List name required');
    if (!selectedBoardId) return dispatchSet('uiError', 'Select a board');

    // Normalize assignees, preserving UID vs email semantics
    const uniq = Array.from(new Set(
      (newListAssignees || [])
        .map(String)
        .map(s => s.trim())
        .filter(Boolean)
    ));

    // If low-level user and no assignees were provided, add the creator so they will see the list
    if ((userLevel <= 2) && uniq.length === 0) {
      if (uid) uniq.push(uid);
      else if (userEmail) uniq.push(userEmail.toLowerCase());
    }

    snapshotRef.current.lists = lists;
    const tempId = `tmp-list-${Date.now()}`;
    dispatchSet('lists', (prev) => [...prev, { id: tempId, name: newListName, position: prev.length, assignees: uniq }]);
    try {
      const created = await boardSvc.createList({
        businessId,
        uid,
        boardId: selectedBoardId,
        name: newListName,
        position: lists?.length || 0,
        assignees: uniq
      });
      dispatchSet('lists', (prev) => prev.map((l) => (l.id === tempId ? created : l)));
      dispatchSet('newListName', '');
      dispatchSet('newListAssignees', []);
      dispatchSet('assigneeSearch', '');
      dispatchSet('assigneeDropdownOpen', false);
    } catch (err) {
      console.error('createList failed', err);
      dispatchSet('lists', snapshotRef.current.lists || []);
      dispatchSet('uiError', err?.message || 'Failed to create list');
    }
  }, [newListName, newListAssignees, selectedBoardId, businessId, uid, lists, canCreateList, dispatchSet, userLevel, userEmail]);

  const handleDeleteList = useCallback(async ({ boardId: bId, listId }) => {
    if (!bId || !listId) return dispatchSet('uiError', 'List/board required');
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    if (!window.confirm('Delete this list and all its cards? This action cannot be undone.')) return;

    dispatchSet('uiError', '');
    snapshotRef.current.lists = lists;
    snapshotRef.current.cardsMap = { ...cardsMap };

    try {
      dispatchSet('lists', (prev) => prev.filter((l) => l.id !== listId));
      dispatchSet('cardsMap', (prev) => {
        const copy = { ...prev };
        delete copy[listId];
        return copy;
      });

      await boardSvc.deleteList({ businessId, uid, boardId: bId, listId });
    } catch (err) {
      console.error('deleteList failed', err);
      dispatchSet('lists', snapshotRef.current.lists || []);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to delete list');
    }
  }, [businessId, uid, lists, cardsMap, canEditBoardValue, dispatchSet]);

  const handleUpdateList = useCallback(async (bId, listId, updates) => {
    if (!listId) return;
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    snapshotRef.current.lists = lists;
    try {
      await boardSvc.updateList({ businessId, uid, boardId: bId, listId, updates });
      dispatchSet('lists', (prev) => prev.map((l) => (l.id === listId ? { ...l, ...updates } : l)));
      dispatchSet('listNameEditing', (p) => ({ ...p, [listId]: false }));
    } catch (err) {
      console.error('updateList failed', err);
      dispatchSet('lists', snapshotRef.current.lists || []);
      dispatchSet('uiError', err?.message || 'Failed to update list');
    }
  }, [businessId, uid, lists, canEditBoardValue, dispatchSet]);

  // inside BusinessDashboard.jsx — replace existing handleCreateCardForList with this version
  const handleCreateCardForList = useCallback(async (listId) => {
    dispatchSet('uiError', '');

    // compute listProgress (prefer explicit list.progress if set, else derive from cardsMap)
    const computeListProgress = (lid) => {
      const listDoc = (lists || []).find(L => String(L.id) === String(lid)) || null;
      if (listDoc && Number.isFinite(Number(listDoc.progress))) {
        return Math.max(0, Math.min(100, Math.round(Number(listDoc.progress))));
      }
      const listCards = Array.isArray(cardsMap[lid]) ? cardsMap[lid] : [];
      if (listCards.length === 0) return 0;

      const included = listCards.filter((c) => {
        const s = String(c.status || '').toLowerCase();
        const rs = String((c.submission && c.submission.reviewStatus) || '').toLowerCase();
        return s === 'done' || rs === 'approved';
      });

      if (included.length === 0) return 0;

      const defaultContribution = Math.round(100 / Math.max(1, listCards.length));
      const contributions = included.map((c) => {
        if (c.submission && typeof c.submission.contribution === 'number')
          return Math.max(0, Math.min(100, Math.round(c.submission.contribution)));
        if (Number.isFinite(Number(c.weight))) return Math.max(0, Math.min(100, Math.round(Number(c.weight))));
        return defaultContribution;
      });

      const sum = contributions.reduce((s, v) => s + v, 0);
      return Math.round(Math.max(0, Math.min(100, sum)));
    };

    const listProgress = computeListProgress(listId);
    if (Number.isFinite(Number(listProgress)) && Number(listProgress) >= 100) {
      return dispatchSet('uiError', 'Cannot create card: list already 100% complete');
    }

    const inputs = newCardInputs[listId] || {};
    const title = (inputs.title || '').trim();
    if (!title) return dispatchSet('uiError', 'Card title required');
    if (!selectedBoardId) return dispatchSet('uiError', 'Select a board');

    const assigned = Array.isArray(inputs.assignees) ? inputs.assignees.filter(Boolean) : [];
    if (assigned.length > 0 && !canAssignTasks) return dispatchSet('uiError', 'Permission denied: you cannot assign tasks to others');

    const due = inputs.dueDate ? new Date(inputs.dueDate) : null;
    const priorityLabel = inputs.priority || 'medium';
    const effort = Number.isFinite(Number(inputs.effort)) ? Number(inputs.effort) : 1;

    // compute priorityRank using computePriority util (no score)
    const cp = computePriority({ dueDate: due, priorityLabel, effort, dependencies: [], title: inputs.title || '' });
    const priorityRank = cp.priorityRank;

    // default weight: if provided use it, else equal split among existing cards + new one
    const parsedWeight = (inputs.weight !== undefined && inputs.weight !== '') ? Number(inputs.weight) : null;
    const defaultWeight = parsedWeight !== null && !Number.isNaN(parsedWeight)
      ? Math.max(0, Math.min(100, Math.round(parsedWeight)))
      : null; // leave weight null when user didn't provide one


    const tempId = `tmp-card-${Date.now()}`;
    const tempCard = {
      id: tempId,
      title,
      description: inputs.description || '',
      assignees: assigned,
      labels: inputs.labels || [],
      priority: priorityLabel,
      priorityRank,
      status: 'todo',
      dueDate: due,
      effort,
      weight: defaultWeight,
      // keep per-card progress for in-progress tracking but card display will show 100% only when submitted/done
      progress: Number(inputs.progress ?? 0),
      complexity: cp.complexity,
      complexityMode: inputs.complexityMode || 'auto',
      createdAt: new Date(),
      createdBy: uid || null,
    };
    snapshotRef.current.cardsMap = { ...cardsMap };
    dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [tempCard, ...(prev[listId] || [])] }));
    try {
      const created = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId, card: tempCard });
      dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => (c.id === tempId ? created : c)) }));
      dispatchSet('newCardInputs', (p) => ({ ...p, [listId]: { title: '', dueDate: '', effort: 3, priority: 'medium', weight: '' } }));
    } catch (err) {
      console.error('createCard failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to create card');
    }
  }, [newCardInputs, selectedBoardId, businessId, uid, cardsMap, lists, canAssignTasks, dispatchSet]);

  // replace existing handleUpdateCard with this version
  const handleUpdateCard = useCallback(async ({ listId, cardId, updates }) => {
    if (!cardId || !listId) return;
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    snapshotRef.current.cardsMap = { ...cardsMap };

    try {
      // Normalize progress if present
      const up = { ...updates };
      if (up.progress !== undefined) {
        let p = Number(up.progress) || 0;
        if (p < 0) p = 0;
        if (p > 100) p = 100;
        up.progress = p;
        if (p === 100) {
          up.status = up.status || 'done';
          up.completedAt = up.completedAt === undefined ? serverTimestamp() : up.completedAt;
        }
      }

      // If priority/dueDate/effort/complexity changed (or caller didn't compute priorityRank), recompute
      const needRank = (up.priority === undefined && up.dueDate === undefined && up.effort === undefined && up.complexity === undefined && up.complexityMode === undefined) ? false : true;
      if (needRank) {
        const newDue = up.dueDate !== undefined ? up.dueDate : undefined;
        const newPriorityLabel = up.priority !== undefined ? up.priority : undefined;
        const newEffort = up.effort !== undefined ? up.effort : undefined;
        const cp = computePriority({
          dueDate: newDue !== undefined ? newDue : undefined,
          priorityLabel: newPriorityLabel !== undefined ? newPriorityLabel : undefined,
          effort: newEffort !== undefined ? newEffort : undefined,
          dependencies: undefined,
          complexity: up.complexity,
          complexityMode: up.complexityMode
        });
        up.priorityRank = cp.priorityRank;
        if (!up.complexity && cp.complexity) up.complexity = cp.complexity;
      }

      // Call service
      await boardSvc.updateCard({ businessId, uid, boardId: selectedBoardId, listId, cardId, updates: up });

      dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: prev[listId].map((c) => (c.id === cardId ? { ...c, ...up } : c)) }));
      dispatchSet('cardEditing', (p) => ({ ...p, [cardId]: false }));
    } catch (err) {
      console.error('updateCard failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to update card');
    }
  }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

  const handleDeleteCard = useCallback(async ({ listId, cardId }) => {
    if (!listId || !cardId) return;
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    if (!window.confirm('Delete this card? This action cannot be undone.')) return;

    dispatchSet('uiError', '');
    snapshotRef.current.cardsMap = { ...cardsMap };

    dispatchSet('cardsMap', (prev) => {
      const copy = { ...prev };
      copy[listId] = (copy[listId] || []).filter((c) => c.id !== cardId);
      return copy;
    });

    try {
      await boardSvc.deleteCard({ businessId, uid, boardId: selectedBoardId, listId, cardId });
    } catch (err) {
      console.error('deleteCard failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to delete card');
    }
  }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

  const handleMoveCard = useCallback(async ({ fromListId, toListId, card }) => {
    if (!fromListId || !toListId || !card) return;
    if (!canEditBoardValue) return dispatchSet('uiError', 'Permission denied');
    if (fromListId === toListId) return;
    snapshotRef.current.cardsMap = { ...cardsMap };
    dispatchSet('cardsMap', (prev) => {
      const src = (prev[fromListId] || []).filter((c) => c.id !== card.id);
      const dest = [{ ...card, id: `tmp-moved-${Date.now()}` }, ...(prev[toListId] || [])];
      return { ...prev, [fromListId]: src, [toListId]: dest };
    });
    try {
      await boardSvc.moveCardBetweenLists({ businessId, uid, boardId: selectedBoardId, fromListId, toListId, cardId: card.id, newPosition: 0 });
    } catch (err) {
      console.error('moveCardBetweenLists failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to move card');
    }
  }, [businessId, uid, selectedBoardId, cardsMap, canEditBoardValue, dispatchSet]);

  const handleSubmitCard = useCallback(async ({ listId, cardId, note = '', type = 'for-review', qaChecked = false, reviewerUid = null, reviewerEmail = null, attachments = [], submission = {} }) => {
    if (!listId || !cardId) return dispatchSet('uiError', 'Card/list required');
    dispatchSet('uiError', '');

    const listCards = cardsMap[listId] || [];
    const card = listCards.find(c => c.id === cardId);
    if (!card) return dispatchSet('uiError', 'Card not found');

    const listDoc = lists.find(l => String(l.id) === String(listId)) || null;
    const mergedAssignees = Array.from(new Set([
      ...(Array.isArray(card.assignees) ? card.assignees : []),
      ...(listDoc && Array.isArray(listDoc.assignees) ? listDoc.assignees : [])
    ].filter(Boolean).map(x => String(x).trim())));

    const isAssignee = mergedAssignees.some(a => {
      const s = String(a).trim();
      if (uid && s === uid) return true;
      if (userEmail && s.toLowerCase() === userEmail.toLowerCase()) return true;
      return false;
    });

    if (!isAssignee) return dispatchSet('uiError', 'Permission denied: you are not assigned to this task');

    snapshotRef.current.cardsMap = { ...cardsMap };

    // derive contribution: prefer caller-provided submission.contribution, else card.weight, else equal split
    const contribution = (submission && typeof submission.contribution === 'number')
      ? Math.round(Math.max(0, Math.min(100, Number(submission.contribution))))
      : (Number.isFinite(Number(card.weight)) ? Math.round(Number(card.weight)) : Math.round(100 / Math.max(1, (listCards.length))));

    // Auto-assign reviewer for low-level submitters (<=2) if they didn't pick a reviewer:
    let chosenReviewerUid = reviewerUid || null;
    let chosenReviewerEmail = reviewerEmail || null;

    if ((!chosenReviewerUid && !chosenReviewerEmail) && (userLevel <= 2)) {
      // pick a member with level > 2 who is NOT in mergedAssignees
      const candidates = (members || []).filter(m => {
        const level = getMemberLevel(m, roles);
        const mKey = m.uid || m.id || null;
        if (!mKey) return false;
        // skip if candidate is an assignee (by uid or email)
        const assigneeConflict = mergedAssignees.some(a => {
          if (!a) return false;
          const s = String(a).trim();
          if (s.includes('@')) return (m.email || '').toLowerCase() === s.toLowerCase();
          return String(mKey) === s;
        });
        return level > 2 && !assigneeConflict;
      });

      if (candidates.length > 0) {
        // prefer highest level, then alphabetical name
        candidates.sort((a, b) => {
          const la = getMemberLevel(a, roles);
          const lb = getMemberLevel(b, roles);
          if (lb !== la) return lb - la;
          return (a.name || a.email || '').localeCompare(b.name || b.email || '');
        });
        const pick = candidates[0];
        chosenReviewerUid = pick.uid || pick.id || null;
      }
    }

    const submissionObj = {
      type: type || 'for-review',
      qaChecked: !!qaChecked,
      reviewerUid: chosenReviewerUid || null,
      reviewerEmail: chosenReviewerEmail || null,
      reviewerAssignedAt: chosenReviewerUid ? new Date() : null,
      reviewStatus: 'pending',
      attachments: Array.isArray(attachments) ? attachments.map(a => ({ name: a.name })) : [],
      contribution // include contribution so updateCard can apply to list.progress on approval
    };

    const updates = {
      status: 'pending', // changed from 'submitted' to 'pending'
      submittedBy: uid || null,
      submission: submissionObj,
    };
    if (note) updates.submissionNote = note;

    const localSubmittedAt = new Date();

    dispatchSet('cardsMap', (prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map(c => c.id === cardId ? { ...c, ...updates, submittedAt: localSubmittedAt } : c)
    }));

    try {
      await boardSvc.updateCard({
        businessId,
        uid,
        boardId: selectedBoardId,
        listId,
        cardId,
        updates
      });

      // notify reviewer if present
      if (submissionObj.reviewerUid) {
        try {
          const notif = {
            id: `notif-${Date.now()}`,
            type: 'assigned-review',
            title: `Task assigned for review`,
            body: `${selectedBoard?.name || 'Board'} — ${card.title}`,
            link: `/business/${businessId}/boards/${selectedBoardId}`,
            createdAt: serverTimestamp(),
            read: false
          };
          await updateDoc(doc(db, 'account', submissionObj.reviewerUid), { notifications: arrayUnion(notif) });
        } catch (err) {
          console.warn('failed to write notification to reviewer account', err);
        }
      } else if (submissionObj.reviewerEmail) {
        try {
          window.alert(`Reviewer assigned: ${submissionObj.reviewerEmail}. (External email notification not implemented in-app.)`);
        } catch (err) { /* ignore */ }
      }

    } catch (err) {
      console.error('submitCard failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to submit card');
    }
  }, [businessId, uid, userEmail, selectedBoardId, cardsMap, lists, dispatchSet, selectedBoard, members, getMemberLevel, roles, userLevel]);

  const handleReviewAction = useCallback(async ({ listId, cardId, action, note = '' }) => {
    if (!listId || !cardId) return dispatchSet('uiError', 'Card/list required');
    if (!['approve', 'reject'].includes(action)) return;

    dispatchSet('uiError', '');
    const listCards = cardsMap[listId] || [];
    const card = listCards.find(c => c.id === cardId);
    if (!card) return dispatchSet('uiError', 'Card not found');

    const submission = card.submission || {};
    const reviewerUid = submission.reviewerUid || null;
    const reviewerEmail = submission.reviewerEmail || null;

    const isReviewer = (reviewerUid && uid && reviewerUid === uid) || (reviewerEmail && userEmail && reviewerEmail.toLowerCase() === userEmail.toLowerCase());
    if (!isReviewer) return dispatchSet('uiError', 'Permission denied: you are not the reviewer for this submission');

    snapshotRef.current.cardsMap = { ...cardsMap };
    const reviewStatus = action === 'approve' ? 'approved' : 'rejected';

    const updates = {
      submission: {
        ...submission,
        reviewStatus,
        reviewedBy: uid || null,
        reviewNote: note || ''
      }
    };

    if (action === 'approve') {
      updates.status = 'done'; // server updateCard will fill completedAt/progress
    } else if (action === 'reject') {
      updates.status = 'rejected';
      // leave progress as-is; submitter can edit & resubmit
    }

    // optimistic local update
    dispatchSet('cardsMap', (prev) => ({
      ...prev,
      [listId]: (prev[listId] || []).map(c => c.id === cardId ? { ...c, ...updates } : c)
    }));

    try {
      await boardSvc.updateCard({
        businessId,
        uid,
        boardId: selectedBoardId,
        listId,
        cardId,
        updates
      });

      const submitterUid = card.submittedBy || card.createdBy || null;
      if (submitterUid) {
        const notif = {
          id: `notif-${Date.now()}`,
          type: action === 'approve' ? 'review-approved' : 'review-rejected',
          title: action === 'approve' ? 'Your submission was approved' : 'Your submission was rejected',
          body: `${selectedBoard?.name || 'Board'} — ${card.title}`,
          link: `/business/${businessId}/boards/${selectedBoardId}`,
          createdAt: serverTimestamp(),
          read: false
        };
        try {
          await updateDoc(doc(db, 'account', submitterUid), { notifications: arrayUnion(notif) });
        } catch (err) {
          console.warn('failed to notify submitter', err);
        }
      } else {
        try {
          window.alert(`Review ${action === 'approve' ? 'approved' : 'rejected'} — submitter not found to notify.`);
        } catch (err) { /* ignore */ }
      }

    } catch (err) {
      console.error('review action failed', err);
      dispatchSet('cardsMap', snapshotRef.current.cardsMap || {});
      dispatchSet('uiError', err?.message || 'Failed to record review action');
    }

  }, [businessId, uid, userEmail, selectedBoardId, cardsMap, lists, dispatchSet, selectedBoard]);

  // NEW: handleUpload -> uses processImageForTasks and reducer state
  const handleUpload = useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    dispatchSet('loading', true);
    dispatchSet('ocrError', null);
    dispatchSet('ocrRaw', null);
    dispatchSet('ocrResult', null);

    try {

      const lowLevelMembers = (members || []).filter(m => {
        const mUid = m.uid || m.id || null;
        if (!mUid) return false;
        if (businessOwnerUid && String(mUid) === String(businessOwnerUid)) return false;
        const lvl = typeof getMemberLevel === 'function' ? getMemberLevel(m, roles) : (m.level ?? null);
        return (typeof lvl === 'number') && (lvl <= 2); // only low-level members
      });

      // candidate emails only (no raw uids) — simple and safe
      const candidateEmails = Array.from(new Set(
        lowLevelMembers.flatMap(m => (m.email ? [String(m.email).toLowerCase().trim()] : []))
      ));

      // excluded tokens: owner + any members with level > 2 (we normalize to lower-case tokens)
      const excluded = new Set();
      if (businessOwnerUid) excluded.add(String(businessOwnerUid).toLowerCase());
      (members || []).forEach(m => {
        const uid = (m.uid || m.id || '').toString().trim();
        const em = (m.email || '').toString().toLowerCase().trim();
        const lvl = typeof getMemberLevel === 'function' ? getMemberLevel(m, roles) : (m.level ?? null);
        if (businessOwnerUid && String(uid) === String(businessOwnerUid)) {
          if (uid) excluded.add(uid.toLowerCase());
          if (em) excluded.add(em);
          return;
        }
        if (typeof lvl === 'number' && lvl > 2) { // higher-level -> exclude
          if (uid) excluded.add(uid.toLowerCase());
          if (em) excluded.add(em);
        }
      });
      const excludedEmails = Array.from(excluded);

      // debug
      console.debug('handleUpload: candidateEmails ->', candidateEmails);
      console.debug('handleUpload: excludedEmails ->', excludedEmails);

      // call OCR with just candidateEmails & excludedEmails (short and clear)
      const res = await processImageForTasks(file, {
        context: 'Extract tasks and UI suggestions for board import',
        candidateEmails,
        excludedEmails,
        // optional: maxAssigneesPerItem: 1, forceOnePerTask: true, etc
      });


      console.log('OCR raw result:', res);
      dispatchSet('ocrRaw', res);

      let parsed = null;
      if (res && typeof res === 'object' && res.raw && typeof res.raw === 'string') {
        parsed = tryParseEmbeddedJson(res.raw) || res;
      } else if (typeof res === 'string') {
        parsed = tryParseEmbeddedJson(res) || res;
      } else {
        parsed = res;
      }

      dispatchSet('ocrResult', parsed);
    } catch (err) {
      console.error('OCR failed', err);
      dispatchSet('ocrError', err?.message || String(err));
    } finally {
      dispatchSet('loading', false);
    }
  }, [
    dispatchSet,
    members,
    emailMap,
    getMemberLevel,
    roles,
    businessOwnerUid,
    processImageForTasks
  ]);

  // In your React component file: replace handleApplyOCRToBoard with this version
  const handleApplyOCRToBoard = useCallback(async () => {
    if (!selectedBoardId) return dispatchSet('uiError', 'Select a board to import into.');
    if (!canCreateList) return dispatchSet('uiError', 'Permission denied to create lists.');
    if (!ocrResult) return dispatchSet('uiError', 'No OCR data to import.');

    dispatchSet('uiError', '');
    dispatchSet('loading', true);

    const deriveListName = () => {
      const s = (ocrResult.listNameSuggestion || ocrResult.listName || ocrResult.title || '').toString().trim();
      if (s) return s.slice(0, 120);
      const up = (ocrResult.uploadPrompt || '').toString().trim();
      if (up) return up.slice(0, 120);
      const firstItemTitle = (ocrResult.arrays && Array.isArray(ocrResult.arrays.documentList) && ocrResult.arrays.documentList[0] && (ocrResult.arrays.documentList[0].title || ocrResult.arrays.documentList[0].text || ocrResult.arrays.documentList[0].description));
      if (firstItemTitle) return String(firstItemTitle).split('\n')[0].slice(0, 120);
      return 'Imported Tasks';
    };

    const listName = deriveListName();
    const tempListId = `tmp-list-${Date.now()}`;
    const tempList = { id: tempListId, name: listName, position: (lists && lists.length) ? lists.length : 0, assignees: [], meta: {} };

    snapshotRef.current.lists = lists;
    dispatchSet('lists', (prev) => [...(prev || []), tempList]);

    try {
      const created = await boardSvc.createList({
        businessId,
        uid,
        boardId: selectedBoardId,
        name: listName,
        position: (lists && lists.length) ? lists.length : 0,
        assignees: [] // Start empty; update with union later
      });
      dispatchSet('lists', (prev) => (prev || []).map(l => l.id === tempListId ? created : l));

      const listId = created.id || created._id || created.listId || null;
      if (!listId) throw new Error('Create list returned invalid result (no id)');
      const realList = created;

      const items = (ocrResult.arrays && Array.isArray(ocrResult.arrays.documentList)) ? ocrResult.arrays.documentList : [];
      const MAX_BATCH = 200;
      const toCreate = items.slice(0, MAX_BATCH);

      // Build low-level member lists (level <= 2)
      const lowLevelMembers = (members || []).filter(m => {
        const mUid = m.uid || m.id || null;
        if (!mUid) return false;
        if (businessOwnerUid && String(mUid) === String(businessOwnerUid)) return false;
        const lvl = typeof getMemberLevel === 'function' ? getMemberLevel(m, roles) : (m.level ?? null);
        return (typeof lvl === 'number') && (lvl <= 2);
      });

      // fallback pool used only for assignment rotation (do NOT automatically add to list union)
      const fallbackPool = lowLevelMembers
        .map(m => (m.uid || m.id) ? (m.uid || m.id) : (m.email ? String(m.email).toLowerCase() : null))
        .filter(Boolean);

      // Build candidateEmails list but ONLY include canonical email strings (do NOT push uids here)
      const candidateEmails = Array.from(new Set([
        ...lowLevelMembers.flatMap(m => {
          const out = [];
          if (m.email) out.push(String(m.email).toLowerCase().trim());
          return out;
        }),
        ...(Object.keys(emailMap || {}) || []).map(k => (k || '').toString().toLowerCase().trim()).filter(Boolean)
      ].map(x => String(x).trim()).filter(Boolean)));

      // helpers: levenshtein, normalizeTokenForEmail, findBestCandidateForToken (kept similar)
      const levenshtein = (a = '', b = '') => {
        const A = String(a || ''), B = String(b || '');
        const al = A.length, bl = B.length;
        if (al === 0) return bl;
        if (bl === 0) return al;
        const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));
        for (let i = 0; i <= al; i++) dp[i][0] = i;
        for (let j = 0; j <= bl; j++) dp[0][j] = j;
        for (let i = 1; i <= al; i++) {
          for (let j = 1; j <= bl; j++) {
            const cost = A[i - 1] === B[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
          }
        }
        return dp[al][bl];
      };

      const normalizeTokenForEmail = (tok = '') => {
        if (!tok) return '';
        return String(tok).trim().toLowerCase().replace(/[()\[\]<>,"'`]/g, '').replace(/\s+/g, '');
      };

      const explicitEmailRE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
      const findBestCandidateForToken = (token) => {
        if (!token) return null;
        const norm = normalizeTokenForEmail(token);
        if (!norm) return null;

        if (explicitEmailRE.test(norm)) {
          const exact = candidateEmails.find(c => c === norm);
          if (exact) return exact;
          return norm;
        }

        const tokenLocal = (norm.split('@')[0] || norm);
        let best = null;
        let bestScore = Infinity;
        for (const candidate of candidateEmails) {
          const candNorm = normalizeTokenForEmail(candidate);
          const candLocal = (candNorm.split('@')[0] || candNorm);
          const localDist = levenshtein(tokenLocal, candLocal);
          const fullDist = levenshtein(norm, candNorm);
          const score = localDist + fullDist * 0.2;
          if (score < bestScore) {
            bestScore = score;
            best = candidate;
          }
        }
        if (best) {
          const candLen = Math.max(1, (best || '').length);
          if (bestScore <= 2 || (bestScore / candLen) <= 0.25) return best;
        }
        return null;
      };

      // Simplified canonicalizer that returns either email or uid (or null) and filters owner
      const canonicalizeTokenToMemberOrEmail = (token) => {
        if (!token) return null;
        const raw = String(token).trim();
        const norm = normalizeTokenForEmail(raw);

        // skip short numeric "garbage"
        if (/^[+\-]?\d{1,3}$/.test(raw)) return null;

        // email-like -> prefer emailMap resolution then return email
        if (norm.includes('@')) {
          const emailKey = norm.toLowerCase();
          if (emailMap && emailMap[emailKey]) {
            const mem = emailMap[emailKey];
            const id = mem.uid || mem.id || null;
            if (id && String(id) === String(businessOwnerUid)) return null;
            // prefer id if available, otherwise email
            return id || emailKey;
          }
          return emailKey;
        }

        // uid or id token -> map via membersMap if possible (prefer uid)
        const uidMatch = raw.match(/^(?:uid:|id:)?([A-Za-z0-9\-_]+)$/i);
        if (uidMatch) {
          const candidate = uidMatch[1];
          if (membersMap && membersMap[candidate]) {
            const mm = membersMap[candidate];
            const id = mm.uid || mm.id || null;
            if (id && String(id) === String(businessOwnerUid)) return null;
            return id || (mm.email ? String(mm.email).toLowerCase() : null);
          }
        }

        // fuzzy best candidate among candidateEmails (but do not auto-add all candidateEmails)
        const fuzzy = findBestCandidateForToken(norm);
        if (fuzzy) {
          if (emailMap && emailMap[fuzzy]) {
            const mem = emailMap[fuzzy];
            const id = mem.uid || mem.id || null;
            if (id && String(id) === String(businessOwnerUid)) return null;
            return id || String(fuzzy).toLowerCase();
          }
          return String(fuzzy).toLowerCase();
        }

        return norm || null;
      };

      // === Build a global pool of tokens FOUND BY OCR (not candidateEmails!!) ===
      const poolCandidates = new Set();

      // 1) per-item assignees returned by OCR (raw)
      toCreate.forEach(it => {
        if (!it) return;
        if (Array.isArray(it.assignees)) {
          it.assignees.forEach(a => {
            if (!a) return;
            const s = String(a).trim();
            if (!s) return;
            poolCandidates.add(normalizeTokenForEmail(s));
          });
        }
      });

      // 2) scan header/footer/global ocrResult.strings (emails only)
      if (ocrResult.strings && typeof ocrResult.strings === 'string') {
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const foundGlobal = Array.from((ocrResult.strings.match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
        foundGlobal.forEach(e => poolCandidates.add(e));
      }

      // 3) scan item text/title/description for emails
      toCreate.forEach(it => {
        if (!it) return;
        const textBlob = `${it.title || ''} ${it.description || ''} ${it.text || ''}`;
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const found = Array.from((String(textBlob).match(emailRegex) || [])).map(e => normalizeTokenForEmail(e));
        found.forEach(e => poolCandidates.add(e));
      });

      // Resolve tokens to members where possible (prefer uid) and keep normalized values in resolvedPool
      const resolvedPoolSet = new Set();
      for (const token of Array.from(poolCandidates)) {
        if (!token) continue;
        const tnorm = normalizeTokenForEmail(token);
        let member = null;
        if (membersMap && membersMap[String(token)]) member = membersMap[String(token)];
        else if (membersMap && membersMap[String(tnorm)]) member = membersMap[String(tnorm)];
        else if (typeof token === 'string' && token.includes('@') && emailMap && emailMap[token.toLowerCase()]) {
          member = emailMap[token.toLowerCase()];
        }
        if (member) {
          const memberUidOrEmail = member.uid || member.id || (member.email && String(member.email).toLowerCase());
          if (!memberUidOrEmail) continue;
          if (businessOwnerUid && memberUidOrEmail && String(memberUidOrEmail) === String(businessOwnerUid)) continue;
          resolvedPoolSet.add(String(memberUidOrEmail));
        } else {
          resolvedPoolSet.add(String(tnorm));
        }
      }

      // Prepare assigneePool (rotation) for assigning cards: prefer resolvedPoolSet, then fallbackPool
      let assigneePool = Array.from(resolvedPoolSet).filter(Boolean);
      if (!assigneePool.length) assigneePool = Array.from(new Set(fallbackPool)).filter(Boolean);
      if (!assigneePool.length && uid) assigneePool = [uid];

      // rotation pointer
      let assigneePoolIndex = 0;

      // compute existing weights and availableForNew (unchanged)
      const stableExistingCards = Array.isArray(cardsMap[listId]) ? (cardsMap[listId] || []).filter(c => !(String(c.id || '').startsWith('tmp-'))) : [];
      const extractWeightFromCard = (c) => {
        if (c.submission && typeof c.submission.contribution === 'number') return clampInt(c.submission.contribution);
        if (Number.isFinite(Number(c.weight))) return clampInt(Number(c.weight));
        return null;
      };
      const existingWeights = stableExistingCards.map(extractWeightFromCard).filter(w => w !== null);
      const sumExisting = existingWeights.reduce((s, v) => s + v, 0);
      const availableForNew = Math.max(0, 100 - sumExisting);

      // Build raw scores and normalized weights (same approach)
      const rawScores = toCreate.map((it, idx) => {
        if (!it) return 0;
        if (typeof it.weight === 'number' && Number.isFinite(it.weight)) return Math.max(0, it.weight);
        if (typeof it.weight === 'string' && /^\d+$/.test(it.weight)) return Math.max(0, parseInt(it.weight, 10));
        const effort = (typeof it.effort === 'number' && Number.isFinite(it.effort)) ? Math.max(1, Math.min(10, Math.round(it.effort))) : null;
        const ps = it.priorityScale ? String(it.priorityScale).toLowerCase() : null;
        const priorityMultiplier = ps === 'high' || ps === 'hard' ? 1.4 : (ps === 'medium' ? 1.0 : (ps === 'easy' ? 0.8 : 1.0));
        if (effort !== null) return effort * priorityMultiplier;
        const combined = ((Array.isArray(it.labels) ? it.labels.join(' ') : '') + ' ' + (it.description || '') + ' ' + (it.text || '')).toLowerCase();
        if (combined.includes('daily')) return 8 * priorityMultiplier;
        if (combined.includes('weekly')) return 5 * priorityMultiplier;
        if (combined.includes('monthly')) return 2 * priorityMultiplier;
        return 3 * priorityMultiplier;
      });

      let normalized = [];
      if (availableForNew === 0) normalized = Array(rawScores.length).fill(0);
      else normalized = normalizeToTargetSum(rawScores, availableForNew);

      // Collect unique assignees across all cards for list update — but only those actually detected/used
      const allUniqueAssignees = new Set();

      console.debug('OCR pools (post-detect):', {
        poolCandidates: Array.from(poolCandidates).slice(0, 200),
        resolvedPool: Array.from(resolvedPoolSet).slice(0, 200),
        assigneePool: assigneePool.slice(0, 200),
        candidateEmails: candidateEmails.slice(0, 200) // candidateEmails used only for mapping NOT auto-add
      });

      // create optimistic cards sequentially (each card gets exactly one assignee)
      let runningWeightSum = 0;
      const failedItems = [];
      for (let idx = 0; idx < toCreate.length; idx++) {
        const item = toCreate[idx] || {};

        const title = (item.title || item.text || item.name || '').toString().trim().split(/\r?\n/).map(s => s.trim()).find(Boolean) || `Imported task (${idx + 1})`;
        const description = (item.description || item.text || '') ? String(item.description || item.text).trim().slice(0, 2000) : '';

        const dueFromOCR = item.dueDate ?? null;
        let dueDate = parseISODateToDate(dueFromOCR);
        if (!dueDate) {
          // optional hook (if present in your environment)
          const inferred = typeof inferDueDateFromItem === 'function' ? inferDueDateFromItem(item) : null;
          if (inferred) dueDate = inferred;
        }

        const effortVal = (typeof item.effort === 'number' && Number.isFinite(item.effort)) ? Math.max(1, Math.min(10, Math.round(item.effort))) : null;

        const w = clampInt(normalized[idx] ?? 0);
        runningWeightSum += w;

        const ps = item.priorityScale ? String(item.priorityScale).toLowerCase() : null;
        let priorityLabel = (item.priority && typeof item.priority === 'string') ? String(item.priority).toLowerCase() : null;
        if (!priorityLabel) {
          if (ps === 'easy') priorityLabel = 'low';
          else if (ps === 'medium') priorityLabel = 'medium';
          else if (ps === 'hard' || ps === 'high') priorityLabel = 'high';
        }
        if (!priorityLabel) {
          if (w >= 70) priorityLabel = 'high';
          else if (w >= 40) priorityLabel = 'medium';
          else priorityLabel = 'low';
        }

        const cp = typeof computePriority === 'function'
          ? computePriority({
            dueDate: dueDate || undefined,
            priorityLabel: priorityLabel || 'medium',
            effort: effortVal !== null ? effortVal : undefined,
            dependencies: [],
            title,
            description
          })
          : { priorityLabel: priorityLabel || 'medium', priorityRank: 50 };

        // --- ASSIGNEE RESOLUTION (single per card) ---
        let finalAssignees = [];

        // Prefer item.assignees returned from OCR (if present). Canonicalize to uid/email and filter owner.
        if (Array.isArray(item.assignees) && item.assignees.length) {
          const first = String(item.assignees[0]);
          // if looks like email
          if (first.includes('@')) {
            const lower = first.toLowerCase();
            if (emailMap && emailMap[lower]) {
              const mm = emailMap[lower];
              const id = mm.uid || mm.id || null;
              if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || lower];
            } else {
              finalAssignees = [lower];
            }
          } else {
            // try membersMap
            if (membersMap && membersMap[first]) {
              const mm = membersMap[first];
              const id = mm.uid || mm.id || null;
              if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || first];
              else finalAssignees = [];
            } else {
              // try fuzzy mapping via candidateEmails
              const mapped = findBestCandidateForToken(first);
              if (mapped) {
                finalAssignees = [(emailMap && emailMap[mapped] ? (emailMap[mapped].uid || emailMap[mapped].id || mapped) : mapped)];
              } else {
                finalAssignees = [first];
              }
            }
          }
        }

        // fallback to rotating assigneePool if no finalAssignees
        if ((!finalAssignees || finalAssignees.length === 0) && assigneePool.length > 0) {
          const usedSet = new Set(Array.from(allUniqueAssignees));
          const poolLen = assigneePool.length;
          let start = Number(assigneePoolIndex || 0);
          let picked = null;
          for (let i = 0; i < poolLen; i++) {
            const idxCandidate = (start + i) % poolLen;
            const cand = assigneePool[idxCandidate];
            if (!usedSet.has(cand)) { picked = cand; assigneePoolIndex = (idxCandidate + 1) % poolLen; break; }
          }
          if (!picked) {
            picked = assigneePool[assigneePoolIndex % poolLen];
            assigneePoolIndex = (assigneePoolIndex + 1) % poolLen;
          }
          if (picked) {
            if (String(picked).includes('@')) {
              const lower = String(picked).toLowerCase();
              if (emailMap && emailMap[lower]) {
                const mm = emailMap[lower];
                const id = mm.uid || mm.id || null;
                if (id && String(id) !== String(businessOwnerUid)) finalAssignees = [id || lower];
                else finalAssignees = [];
              } else {
                finalAssignees = [lower];
              }
            } else {
              if (membersMap && membersMap[picked]) {
                const mm = membersMap[picked];
                finalAssignees = [mm.uid || mm.id || picked];
              } else {
                finalAssignees = [picked];
              }
            }
          }
        }

        // final canonical mapping: map any emails to uid when possible, keep uids intact
        finalAssignees = Array.from(new Set(finalAssignees.map(f => {
          if (!f) return null;
          const fs = String(f);
          if (fs.includes('@')) {
            const lower = fs.toLowerCase();
            if (emailMap && emailMap[lower]) return emailMap[lower].uid || emailMap[lower].id || lower;
            return lower;
          }
          if (membersMap && membersMap[fs]) {
            const mm = membersMap[fs];
            return mm.uid || mm.id || fs;
          }
          return fs;
        }).filter(Boolean)));

        finalAssignees = finalAssignees.slice(0, 1); // enforce one per card

        // --- Collect canonical tokens for final list union BUT ONLY tokens that were actually detected or used ---
        // We create canonicalItemAssignees from:
        //  - item.assignees (OCR) canonicalized,
        //  - explicit emails found in the item's text/title,
        //  - the final chosen assignee (finalAssignees) — this is important: if we assigned a fallback, the fallback was used and should appear in list union.
        const canonicalItemAssignees = new Set();

        // raw OCR tokens
        if (Array.isArray(item.assignees)) {
          for (const tok of item.assignees) {
            const canon = canonicalizeTokenToMemberOrEmail(tok);
            if (canon) canonicalItemAssignees.add(canon);
          }
        }

        // explicit foundInText (emails)
        const textBlob = `${item.title || ''} ${item.description || ''}`;
        const foundInText = Array.from((String(textBlob).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])).map(e => e.toLowerCase());
        for (const e of foundInText) {
          const canon = canonicalizeTokenToMemberOrEmail(e);
          if (canon) canonicalItemAssignees.add(canon);
        }

        // include the actually chosen finalAssignees (if any) — important because fallback rotation used them
        finalAssignees.forEach(a => {
          if (a && String(a) !== String(businessOwnerUid)) canonicalItemAssignees.add(a);
        });

        // Add canonicalItemAssignees to the global union
        canonicalItemAssignees.forEach(a => {
          if (a && String(a) !== String(businessOwnerUid)) allUniqueAssignees.add(a);
        });

        console.debug('OCR item idx', idx, 'rawAssignees', item.assignees, 'finalAssignees', finalAssignees, 'canonicalItemAssignees', Array.from(canonicalItemAssignees).slice(0, 10));

        const tempCardId = `tmp-card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const tempCard = {
          id: tempCardId,
          title,
          description,
          assignees: finalAssignees,
          labels: Array.isArray(item.labels) ? item.labels : (item.labels ? [String(item.labels)] : []),
          priority: cp.priorityLabel || priorityLabel || 'medium',
          priorityRank: Number(cp.priorityRank || 50),
          status: 'todo',
          dueDate: dueDate,
          effort: effortVal,
          weight: w,
          createdAt: new Date(),
          createdBy: uid || null,
        };

        snapshotRef.current.cardsMap = { ...cardsMap };
        dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: [tempCard, ...((prev && prev[listId]) || [])] }));

        const cardToSend = { ...tempCard };
        delete cardToSend.id;

        try {
          const createdCard = await boardSvc.createCard({ businessId, uid, boardId: selectedBoardId, listId: listId, card: cardToSend });
          if (createdCard && (createdCard.id || createdCard._id)) {
            dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).map(c => c.id === tempCardId ? createdCard : c) }));
          } else {
            console.debug('createCard returned unexpected shape:', createdCard);
          }
        } catch (cardErr) {
          console.error('Failed to create card from OCR item', cardErr, item);
          dispatchSet('cardsMap', (prev) => ({ ...prev, [listId]: (prev[listId] || []).filter(c => c.id !== tempCardId) }));
          runningWeightSum -= w;
          failedItems.push({ index: idx, item, error: (cardErr && cardErr.message) ? cardErr.message : String(cardErr) });
        }
      } // end for items

      // attach local metadata for UI progress calculation
      dispatchSet('lists', (prev) => {
        return (prev || []).map(l => {
          if (String(l.id) === String(listId) || l.id === tempListId) {
            const copy = { ...l };
            copy.meta = { ...(copy.meta || {}), weightSum: (copy.meta?.weightSum || 0) + runningWeightSum };
            return copy;
          }
          return l;
        });
      });

      // attempt to persist list meta to server (best-effort)
      if (typeof boardSvc.updateList === 'function' && realList && (realList.id || listId)) {
        try {
          await boardSvc.updateList({ businessId, uid, boardId: selectedBoardId, listId: listId, updates: { meta: { ...(realList.meta || {}), weightSum: runningWeightSum } } });
        } catch (metaErr) {
          console.warn('Could not persist list meta.weightSum', metaErr);
        }
      }

      // ------------------- BUILD FINAL UNIQUE ASSIGNEES ARRAY (STRICTED) -------------------
      // We will:
      // 1) Map emails -> member UIDs via emailMap (if present).
      // 2) Keep only tokens that correspond to low-level members (level <= 2).
      // 3) Exclude owner/higher-level tokens.
      // 4) Normalize to UID when possible, otherwise skip external emails (since you want only low-level members).

      // build quick lookup of low-level members (uids + emails)
      const lowLevelUidSet = new Set();
      const lowLevelEmailToUid = {}; // email -> uid
      (lowLevelMembers || []).forEach(m => {
        const mid = (m.uid || m.id || '').toString().trim();
        const em = (m.email || '').toString().toLowerCase().trim();
        if (mid) lowLevelUidSet.add(mid);
        if (mid && em) lowLevelEmailToUid[em] = mid;
      });

      // helper to canonicalize final token -> uid (only allow low-level members)
      const canonicalToLowLevelUid = (tok) => {
        if (!tok) return null;
        const s = String(tok).trim();
        const n = s.toLowerCase();
        // if it's a uid and exists in low-level set => keep
        if (lowLevelUidSet.has(s)) return s;
        // if it's an email:
        if (n.includes('@')) {
          // 1) if emailMap has a member, map to uid and ensure low-level
          if (emailMap && emailMap[n]) {
            const mm = emailMap[n];
            const mmUid = mm.uid || mm.id || null;
            if (mmUid && lowLevelUidSet.has(mmUid)) return mmUid;
            // if member exists but is higher-level, skip it
            return null;
          }
          // 2) maybe it's a direct low-level email (in lowLevelEmailToUid)
          if (lowLevelEmailToUid[n]) return lowLevelEmailToUid[n];
          // 3) otherwise it's an external email — skip (you said exclude non-low-level)
          return null;
        }
        // fallback: maybe token is fuzzy uid-like; see membersMap
        if (membersMap && membersMap[s]) {
          const mm = membersMap[s];
          const mmUid = mm.uid || mm.id || null;
          if (mmUid && lowLevelUidSet.has(mmUid)) return mmUid;
        }
        return null;
      };

      // map and dedupe
      const mappedUids = new Set();
      for (const tok of Array.from(allUniqueAssignees || [])) {
        const uid = canonicalToLowLevelUid(tok);
        if (uid && String(uid) !== String(businessOwnerUid)) mappedUids.add(uid);
      }

      // final array (uids only). If you prefer to save emails instead, change mapping above.
      const finalUniqueAssigneesUids = Array.from(mappedUids);

      // debug visibility to console
      console.debug('final-unique-assignees (LOW-LEVEL-ONLY):', finalUniqueAssigneesUids.slice(0, 200));

      // persist if non-empty
      if (finalUniqueAssigneesUids.length > 0 && typeof boardSvc.updateList === 'function') {
        try {
          await boardSvc.updateList({
            businessId,
            uid,
            boardId: selectedBoardId,
            listId: listId,
            updates: { assignees: finalUniqueAssigneesUids }
          });
          dispatchSet('lists', (prev) => prev.map(l => l.id === listId ? { ...l, assignees: finalUniqueAssigneesUids } : l));
        } catch (updateErr) {
          console.warn('Failed to update list assignees with union', updateErr);
        }
      }


    } catch (err) {
      console.error('Failed to import OCR list', err);
      dispatchSet('lists', (prev) => (prev || []).filter(l => l.id !== tempListId));
      dispatchSet('uiError', err?.message || 'Failed to import OCR results.');
    } finally {
      dispatchSet('loading', false);
    }
  }, [
    selectedBoardId,
    canCreateList,
    ocrResult,
    lists,
    businessId,
    uid,
    dispatchSet,
    computePriority,
    boardSvc,
    cardsMap,
    emailMap,
    members,
    membersMap,
    getMemberLevel,
    roles,
    businessOwnerUid
  ]);




  // assignee dropdown candidates
  const assigneeCandidates = useMemo(() => {
    const q = (assigneeSearch || '').toLowerCase().trim();
    const list = (members || []).map(m => ({
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

  const showAside = userLevel > 2;

  return (
    <main className={`bd-root p-4 ${showAside ? '' : 'no-aside'}`}>
      <div className="bd-header" onClick={() => { if (showHeaderActions) dispatchSet('showHeaderActions', false); }}>
        {/* LEFT: title + subtitle */}
        <div className="bd-head-left" role="banner">
          <h1 className="bd-title">Business Dashboard</h1>
          <div className="bd-sub">
            {businessName ? businessName : businessId || "—"}: {currentUser?.email || "—"}
            {userRoleName ? ` • Role: ${userRoleName}` : userRoleId ? ` • Role: ${userRoleId}` : ""}
          </div>
        </div>

        {/* RIGHT: actions (desktop) + mobile toggle */}
        <div className="bd-head-right">
          {/* mobile toggle (visible only on small screens via CSS) */}
          <button
            className="bd-mobile-toggle"
            aria-expanded={showHeaderActions}
            aria-label="Toggle header actions"
            onClick={(e) => { e.stopPropagation(); dispatchSet('showHeaderActions', s => !s); }}
            type="button"
          >
            {/* simple hamburger / actions icon */}
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* actions container: visible in desktop; becomes a popover in mobile when .open */}
          <div className={`bd-actions ${showHeaderActions ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
            {selectedBoard && canEditBoardValue && (
              <>
                <label className={`bd-btn inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${loading ? 'opacity-60' : 'hover:bg-gray-800'}`}>
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={loading} />
                  <span className="btn-icon" aria-hidden>
                    {loading ? '⏳' :
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.5 11V6.5C18.5 5.37283 18.0519 4.29215 17.2549 3.49512C16.4579 2.69809 15.3772 2.25 14.25 2.25H5.75C4.62283 2.25 3.54215 2.69809 2.74512 3.49512C1.94809 4.29215 1.5 5.37283 1.5 6.5V13.5C1.5 14.058 1.60979 14.6105 1.82324 15.126C2.03682 15.6416 2.35047 16.1102 2.74512 16.5049C3.54215 17.3019 4.62283 17.75 5.75 17.75H12.0098C12.424 17.75 12.7598 18.0858 12.7598 18.5C12.7598 18.9142 12.424 19.25 12.0098 19.25H5.75C4.22501 19.25 2.7629 18.6438 1.68457 17.5654C1.15063 17.0315 0.726465 16.3978 0.4375 15.7002C0.148609 15.0026 0 14.255 0 13.5V6.5C0 4.97501 0.606236 3.5129 1.68457 2.43457C2.7629 1.35624 4.22501 0.75 5.75 0.75H14.25C15.775 0.75 17.2371 1.35624 18.3154 2.43457C19.3938 3.5129 20 4.97501 20 6.5V11C20 11.4142 19.6642 11.75 19.25 11.75C18.8358 11.75 18.5 11.4142 18.5 11Z" fill="#fff" />
                        <path d="M14.0585 7.01957C15.1106 6.93192 16.16 7.19728 17.0419 7.77055L17.2157 7.88969L17.2382 7.90629L19.7089 9.81645C20.0363 10.0699 20.096 10.5406 19.8427 10.8682C19.5893 11.1959 19.1186 11.2563 18.7909 11.003L16.3368 9.10454C15.7113 8.65963 14.9477 8.45093 14.1825 8.51469C13.4149 8.57878 12.6951 8.91347 12.1513 9.45903L9.81825 11.792C9.33575 12.2712 8.7021 12.5688 8.02529 12.6348C7.34852 12.7007 6.66932 12.5313 6.10341 12.1543C5.82524 11.9691 5.49173 11.8846 5.15907 11.917C4.83191 11.949 4.52555 12.0916 4.28993 12.3204L1.579 15.4873C1.30958 15.8019 0.83598 15.8388 0.52138 15.5694C0.207001 15.2999 0.170999 14.8263 0.440325 14.5118L3.17958 11.3116C3.19271 11.2962 3.20726 11.2818 3.22157 11.2676C3.70401 10.7886 4.33689 10.4909 5.01357 10.4248C5.69038 10.3589 6.36949 10.5283 6.93544 10.9053C7.21357 11.0906 7.54716 11.174 7.87978 11.1416C8.21247 11.1092 8.52445 10.9631 8.76161 10.7276L11.0897 8.39946C11.8846 7.60236 12.9366 7.11306 14.0585 7.01957ZM5.98525 4.09965C6.30154 4.09776 6.61513 4.15816 6.9081 4.27739C7.20109 4.39669 7.46818 4.57266 7.69325 4.79496C7.91839 5.01741 8.09772 5.2826 8.2206 5.57426C8.34342 5.86587 8.40814 6.17875 8.41005 6.49516C8.41196 6.81164 8.35069 7.12587 8.23134 7.41899C8.112 7.71188 7.93605 7.97818 7.71376 8.20317C7.49136 8.42827 7.22705 8.60764 6.93544 8.73051C6.64389 8.85334 6.3309 8.91801 6.01454 8.91996C5.37538 8.92382 4.76024 8.67291 4.30556 8.22368C3.85114 7.77453 3.59366 7.16338 3.58974 6.52446C3.58589 5.88529 3.83581 5.27016 4.28505 4.81547C4.73428 4.36083 5.34611 4.1035 5.98525 4.09965ZM5.99404 5.59965C5.75275 5.60114 5.52203 5.69852 5.35243 5.87016C5.18291 6.04174 5.08841 6.27351 5.08974 6.51469C5.09119 6.75604 5.18856 6.98764 5.36025 7.15727C5.53183 7.32669 5.76366 7.42132 6.00478 7.41997C6.12428 7.41925 6.24328 7.39507 6.35341 7.34868C6.46345 7.30228 6.56343 7.2344 6.64736 7.14946C6.73131 7.06446 6.79762 6.96323 6.84267 6.85258C6.88765 6.74199 6.91077 6.62335 6.91005 6.50395C6.9093 6.38457 6.8851 6.26632 6.83876 6.15629C6.79239 6.04623 6.72448 5.94631 6.63954 5.86235C6.55453 5.77835 6.45335 5.7121 6.34267 5.66704C6.23201 5.62199 6.11351 5.59893 5.99404 5.59965Z" fill="#fff" />
                        <path d="M15.957 18V13C15.957 12.5858 16.2928 12.25 16.707 12.25C17.1212 12.25 17.457 12.5858 17.457 13V18C17.457 18.4142 17.1212 18.75 16.707 18.75C16.2928 18.75 15.957 18.4142 15.957 18Z" fill="#fff" />
                        <path d="M16.707 12.2529C16.8662 12.2529 17.0238 12.2846 17.1708 12.3457C17.3175 12.4067 17.4512 12.4959 17.5634 12.6084L19.5302 14.5752C19.8231 14.8681 19.8231 15.3429 19.5302 15.6357C19.2373 15.9286 18.7625 15.9286 18.4697 15.6357L16.707 13.873L14.9443 15.6357C14.6514 15.9286 14.1766 15.9286 13.8837 15.6357C13.5908 15.3429 13.5909 14.8681 13.8837 14.5752L15.8505 12.6084C15.9627 12.4959 16.0963 12.4067 16.2431 12.3457L16.3554 12.3057C16.4692 12.2711 16.5876 12.2529 16.707 12.2529Z" fill="#fff" />
                      </svg>
                    }
                  </span>
                  <span className="btn-text">Upload</span>
                </label>

                <button
                  className="bd-btn"
                  onClick={() => {
                    dispatchSet('editingBoard', true);
                    dispatchSet('boardDraft', { name: selectedBoard.name || "", description: selectedBoard.description || "" });
                    dispatchSet('showHeaderActions', false);
                  }}
                >
                  <span className="btn-text">Edit Board</span>
                </button>

                <button className="bd-btn" onClick={() => { handleDeleteBoard(selectedBoard.id); dispatchSet('showHeaderActions', false); }} style={{ marginLeft: 8 }}>
                  <span className="btn-text">Delete Board</span>
                </button>

                {ocrResult && (
                  <>
                    <button
                      className="bd-btn"
                      onClick={() => { handleApplyOCRToBoard(); dispatchSet('showHeaderActions', false); }}
                      disabled={!canCreateList || !selectedBoardId || loading}
                      style={{ marginLeft: 8 }}
                    >
                      <span className="btn-text">Import OCR → Board</span>
                    </button>
                    <button
                      className="bd-btn"
                      onClick={() => { console.log('OCR preview', ocrResult); dispatchSet('showHeaderActions', false); }}
                      style={{ marginLeft: 8 }}
                    >
                      <span className="btn-text">Preview OCR JSON</span>
                    </button>
                  </>
                )}

                {ocrError && <div className="bd-ocr-error" style={{ color: 'var(--bd-error)', marginTop: 6 }}>{ocrError}</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {uiError && <div className="bd-uierror">{uiError}</div>}

      <div className="bd-grid">
        {showAside ? (

          <aside className="bd-aside">
            <BoardSidebar
              boards={boards}
              boardQuery={boardQuery}
              setBoardQuery={(v) => dispatchSet('boardQuery', v)}
              boardView={boardView}
              setBoardView={(v) => dispatchSet('boardView', v)}
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
            />
            {canViewMembers ? (
              <MembersPanel
                members={members}
                membersLoading={membersLoading}
                membersError={membersError}
                memberQuery={memberQuery}
                setMemberQuery={(v) => dispatchSet('memberQuery', v)}
                membersPerPage={membersPerPage}
                setMembersPerPage={setMembersPerPage}
                visibleMembers={visibleMembers}
                memberPage={memberPage}
                membersTotalPages={membersTotalPages}
                gotoMemberPage={gotoMemberPage}
                roles={roles}
                copyEmail={copyEmail}
                copiedEmailId={copiedEmailId}
              />
            ) : (
              <div className="bd-section members-panel restricted">
                <div className="members-head"><h4>Members</h4><span className="count">{members.length}</span></div>
                <div className="muted">Members list is restricted for your role.</div>
              </div>
            )}
          </aside>
        ) : null}

        <section className="bd-main">
          <div className="board-content">
            {!selectedBoard ? (
              <div className="bd-empty">{userLevel <= 2 ? "No assigned board available." : "Select a board from the left."}</div>
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

                <div className="lists-wrap">
                  {listsVisible.map((l) => (
                    <ListColumn
                      key={l.id}
                      boardId={selectedBoardId}
                      list={l}
                      lists={lists}
                      cards={cardsMap[l.id] || []}
                      listNameEditing={listNameEditing}
                      listNameDrafts={listNameDrafts}
                      setListNameDrafts={(p) => dispatchSet('listNameDrafts', p)}
                      setListNameEditing={(p) => dispatchSet('listNameEditing', p)}
                      handleUpdateList={handleUpdateList}
                      handleDeleteList={handleDeleteList}
                      canEdit={canEditBoardValue}
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
                      roles={roles} // NEW: pass roles to ListColumn

                    />
                  ))}

                  {canCreateList && (
                    <div className="list-col add-list">
                      <div className="add-list-head">Add list</div>
                      <input style={{ width: '100%', borderRadius: 8, padding: '10px', background: 'var(--bd-inp_list)' }} value={newListName} onChange={(e) => dispatchSet('newListName', e.target.value)} placeholder="New list name" />

                      <div style={{ width: '100%', position: 'relative' }} ref={assigneeRef}>
                        <input
                          placeholder="Search members to assign..."
                          value={assigneeSearch}
                          onChange={(e) => { dispatchSet('assigneeSearch', e.target.value); dispatchSet('assigneeDropdownOpen', true); }}
                          onFocus={() => dispatchSet('assigneeDropdownOpen', true)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--bd-inp_list)' }}
                          aria-expanded={assigneeDropdownOpen}
                          aria-haspopup="listbox"
                        />
                        {assigneeDropdownOpen && (
                          <div style={{
                            position: 'absolute',
                            zIndex: 200,
                            left: 0,
                            right: 0,
                            marginTop: 6,
                            background: 'var(--bd-inp_list)',
                            border: '1px solid rgba(0,0,0,0.06)',
                            borderRadius: 8,
                            maxHeight: 220,
                            overflow: 'auto',
                            padding: 8,
                          }} role="listbox">
                            {assigneeCandidates.length === 0 ? (
                              <div style={{ padding: 8, color: 'var(--sidenav-ISO)' }}>No members found</div>
                            ) :
                              assigneeCandidates.map((cand) => {
                                const key = cand.id || cand.email;
                                const value = (cand.email || '').toLowerCase();
                                const checked = newListAssignees.includes(value);
                                return (
                                  <div
                                    key={String(key)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '6px 8px',
                                      borderRadius: 6,
                                      cursor: 'pointer'
                                    }}
                                    role="option"
                                    aria-selected={checked}
                                    onClick={() => {
                                      toggleAssignee(value);
                                      dispatchSet('assigneeSearch', '');
                                      dispatchSet('assigneeDropdownOpen', false);
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                      <div style={{
                                        width: 36, height: 36, borderRadius: 8, display: 'inline-flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(255,255,255,0.02)', fontWeight: 700
                                      }}>
                                        {(cand.name || cand.email || '').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                                      </div>
                                      <div style={{ fontSize: 14 }}>
                                        <div style={{ fontWeight: 700 }}>{cand.name || cand.email}</div>
                                        <div style={{ fontSize: 12, color: 'var(--sidenav-ISO)' }}>{cand.email}</div>
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

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {newListAssignees.map(a => {
                          const label = (a && a.includes('@')) ? a : (membersMap[a] ? (membersMap[a].email || membersMap[a].name || a) : a);
                          return (
                            <div key={String(a)} style={{ background: 'rgba(0,0,0,0.04)', padding: '6px 10px', borderRadius: 999, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontWeight: 700 }}>{label}</span>
                              <button onClick={() => removeAssignee(a)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
                            </div>
                          );
                        })}
                      </div>

                      <button onClick={handleCreateList} style={{ marginTop: 8 }}>Create list</button>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}