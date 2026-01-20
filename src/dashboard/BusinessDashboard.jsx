// src/pages/BusinessDashboard.jsx
import { useMemo, useCallback } from 'react';

import usePagination from '../hooks/usePagination';
import BoardSidebar from './Bcomponent/BoardSidebar';
import MembersPanel from './Bcomponent/MembersPanel';
import BoardTop from './Bcomponent/BoardTop';
import ListColumn from './Bcomponent/ListColumn';
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


// Extracted initial state for clarity
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

export default function BusinessDashboard({ businessId: propBusinessId = null }) {

  const { state, dispatchSet, uid, userEmail, profile, currentUser } = useUserData(propBusinessId, initialState);

  const { businessId, businessName, businessOwnerUid, boards, selectedBoardId, lists, cardsMap, roles, members, membersLoading, membersError, uiError, boardQuery, boardView, memberQuery, editingBoard, boardDraft, newBoardName, newListName, newListAssignees, assigneeSearch, assigneeDropdownOpen, listNameEditing, listNameDrafts, cardEditing, cardDrafts, newCardInputs, copiedEmailId, loading, ocrRaw, ocrResult, ocrError, showHeaderActions } = state;

  const getMemberLevel = useCallback((m, rolesList = roles) => {
    if (typeof m.level === 'number') return m.level;
    const roleFromList = (rolesList || roles).find((r) => r.id === m.roleId || r.name === m.roleName);
    if (roleFromList && typeof roleFromList.level === 'number') return roleFromList.level;
    if (roleFromList && typeof roleFromList.priority === 'number') return roleFromList.priority;
    return 0;
  }, [roles]);

  const { userRoleId, userLevel, userRoleName, canEditBoardValue, canCreateBoard, canCreateList, canViewMembers, canAssignTasks, canDeleteBoard, canDeleteList, canUpdateList, canCreateCard, canUseOCR, canViewBoards, boardsFiltered, membersFiltered, listsVisible, reviewerOptions, membersMap, emailMap } = usePermissionsAndDerived({ profile, businessId, roles, members, boards, boardQuery, memberQuery, lists, uid, userEmail, getMemberLevel, businessOwnerUid });

  useBusinessLoading({ businessId, dispatchSet, profile, uid });
  useRolesAndMembers({ businessId, dispatchSet, businessOwnerUid, members });


  useBoardsAndLists({ businessId, dispatchSet, selectedBoardId, userLevel, boards });
  useCards({ businessId, selectedBoardId, lists, dispatchSet });


  const { page: boardPage, perPage: boardsPerPage, setPerPage: setBoardsPerPage, totalPages: boardsTotalPages, visible: visibleBoards, goto: gotoBoardPage, setPage: setBoardPage } = usePagination(boardsFiltered, 6);
  const { page: memberPage, perPage: membersPerPage, setPerPage: setMembersPerPage, totalPages: membersTotalPages, visible: visibleMembers, goto: gotoMemberPage } = usePagination(membersFiltered, 6);

  const assigneeRef = useAssigneeDropdown({ dispatchSet })

  const copyEmail = useCopyEmail({ dispatchSet });

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId) || null, [boards, selectedBoardId]);

  const { handleRefreshBoard, handleUpdateBoard, handleDeleteBoard, handleCreateBoard } = useBoardHandlers({ businessId, uid, dispatchSet, boards, selectedBoardId, canEditBoardValue, newBoardName });

  const { handleCreateList, handleDeleteList, handleUpdateList } = useListHandlers({ businessId, uid, dispatchSet, selectedBoardId, cardsMap, lists, newListName, newListAssignees, canCreateList, canEditBoardValue, userLevel, userEmail });

  const { handleCreateCardForList, handleUpdateCard, handleDeleteCard, handleMoveCard } = useCardHandlers({ businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, canEditBoardValue, canAssignTasks, newCardInputs });

  const { handleSubmitCard, handleReviewAction } = useSubmissionHandlers({ businessId, uid, userEmail, dispatchSet, selectedBoardId, cardsMap, lists, selectedBoard, members, getMemberLevel, roles, userLevel });

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

  const showAside = canViewBoards || canViewMembers;

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
            {selectedBoard && (
              <>
                {canUseOCR && (
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
                )}

                {canEditBoardValue && (
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
                )}

                {canDeleteBoard && (
                  <button className="bd-btn" onClick={() => { handleDeleteBoard(selectedBoard.id); dispatchSet('showHeaderActions', false); }} style={{ marginLeft: 8 }}>
                    <span className="btn-text">Delete Board</span>
                  </button>
                )}

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
                // <div className="bd-section members-panel restricted">
                //   <div className="members-head"><h4>Members</h4><span className="count">{members.length}</span></div>
                //   <div className="muted">Members list is restricted for your role.</div>
                // </div>
                <></>
            )}
          </aside>
        ) : null}

        <section className="bd-main">
          <div className="board-content">
            {!selectedBoard ? (
              <div className="bd-empty">{(!canViewBoards) ? "No board selected." : "Select a board from the left."}</div>
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
                      canEdit={canEditBoardValue} // Keeping for legacy/fallback
                      canUpdateList={canUpdateList} // NEW
                      canDeleteList={canDeleteList} // NEW
                      canCreateCard={canCreateCard} // NEW
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