export const PERMISSIONS = [
    // Business Profile & Settings
    { key: 'business.update', name: 'Update Business Profile', description: 'Can update business name, logo, and contact info' },
    { key: 'business.delete', name: 'Delete Business', description: 'Can delete the business' },
    { key: 'settings.view', name: 'View Settings', description: 'Can view business settings' },
    { key: 'settings.update', name: 'Update Settings', description: 'Can modify business settings' },

    // Roles & Members
    { key: 'roles.read', name: 'View Roles', description: 'Can view the list of roles' },
    { key: 'roles.manage', name: 'Manage Roles', description: 'Can create, update, and delete roles' },
    { key: 'members.read', name: 'View Members', description: 'Can view the list of members' },
    { key: 'members.invite', name: 'Invite Members', description: 'Can invite new members to the business' },
    { key: 'members.remove', name: 'Remove Members', description: 'Can remove members from the business' },

    // Boards
    { key: 'boards.read', name: 'View Boards', description: 'Can view boards' },
    { key: 'boards.create', name: 'Create Boards', description: 'Can create new boards' },
    { key: 'boards.update', name: 'Update Boards', description: 'Can rename or edit board descriptions' },
    { key: 'boards.delete', name: 'Delete Boards', description: 'Can delete boards' },

    // Lists
    { key: 'lists.create', name: 'Create Lists', description: 'Can create lists within a board' },
    { key: 'lists.update', name: 'Update Lists', description: 'Can rename lists' },
    { key: 'lists.delete', name: 'Delete Lists', description: 'Can delete lists' },

    // Cards (Tasks)
    { key: 'cards.create', name: 'Create Cards', description: 'Can create new cards/tasks' },
    { key: 'cards.read', name: 'View Cards', description: 'Can view cards' },
    { key: 'cards.update', name: 'Update Cards', description: 'Can edit card details' },
    { key: 'cards.delete', name: 'Delete Cards', description: 'Can delete cards' },
    { key: 'cards.move', name: 'Move Cards', description: 'Can move cards between lists' },
    { key: 'cards.assign', name: 'Assign Members', description: 'Can assign members to cards' },
    { key: 'reviews.receive', name: 'Receive Submissions', description: 'Can be assigned as a reviewer for task submissions' },

    // OCR Features
    { key: 'ocr.use', name: 'Use OCR', description: 'Can use OCR features to import data' },

    // AI Features
    { key: 'ai.chat', name: 'Use AI Co-Pilot', description: 'Can use the AI co-pilot chat assistant' },
];

export const PERMISSION_CATEGORIES = [
    'business', 'settings', 'roles', 'members', 'boards', 'lists', 'cards', 'ocr', 'ai'
];
