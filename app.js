// ============================================
// Notes App - Main JavaScript
// ============================================

class NotesApp {
    constructor() {
        this.notes = [];
        this.groups = [];
        this.currentNoteId = null;
        this.currentGroupId = null;
        this.autoSaveTimeout = null;
        this.isMobileSidebarOpen = false;

        // Touch gesture tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        this.initializeElements();
        this.loadGroups();
        this.loadNotes();
        this.attachEventListeners();
        this.updateUI();
    }

    // Initialize DOM elements
    initializeElements() {
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.groupsList = document.getElementById('groupsList');
        this.groupsCount = document.getElementById('groupsCount');
        this.emptyState = document.getElementById('emptyState');
        this.notesView = document.getElementById('notesView');
        this.notesViewTitle = document.getElementById('notesViewTitle');
        this.notesViewCount = document.getElementById('notesViewCount');
        this.notesGrid = document.getElementById('notesGrid');
        this.editorContainer = document.getElementById('editorContainer');
        this.noteTitleInput = document.getElementById('noteTitleInput');
        this.noteContentInput = document.getElementById('noteContentInput');
        this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
        this.backToNotesBtn = document.getElementById('backToNotesBtn');
        this.lastEdited = document.getElementById('lastEdited');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.sidebar = document.querySelector('.sidebar');
    }

    // Attach event listeners
    attachEventListeners() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());
        this.backToNotesBtn.addEventListener('click', () => this.backToNotesList());

        // Mobile menu
        this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileSidebar());
        this.mobileOverlay.addEventListener('click', () => this.closeMobileSidebar());

        // Touch gestures for swipe
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

        // Auto-save on input
        this.noteTitleInput.addEventListener('input', () => this.scheduleAutoSave());
        this.noteContentInput.addEventListener('input', () => this.scheduleAutoSave());
    }

    // Load groups from localStorage
    loadGroups() {
        const savedGroups = localStorage.getItem('groups');
        if (savedGroups) {
            try {
                this.groups = JSON.parse(savedGroups);
            } catch (e) {
                console.error('Error loading groups:', e);
                this.groups = [];
            }
        }

        // Create default group if none exists
        if (this.groups.length === 0) {
            const defaultGroup = {
                id: 'default',
                name: 'All Notes',
                createdAt: new Date().toISOString()
            };
            this.groups.push(defaultGroup);
            this.saveGroups();
        }

        // Set current group to default
        this.currentGroupId = this.groups[0].id;
    }

    // Save groups to localStorage
    saveGroups() {
        try {
            localStorage.setItem('groups', JSON.stringify(this.groups));
        } catch (e) {
            console.error('Error saving groups:', e);
        }
    }

    // Load notes from localStorage
    loadNotes() {
        const savedNotes = localStorage.getItem('notes');
        if (savedNotes) {
            try {
                this.notes = JSON.parse(savedNotes);
            } catch (e) {
                console.error('Error loading notes:', e);
                this.notes = [];
            }
        }
    }

    // Save notes to localStorage
    saveNotes() {
        try {
            localStorage.setItem('notes', JSON.stringify(this.notes));
        } catch (e) {
            console.error('Error saving notes:', e);
        }
    }

    // Create a new note
    createNewNote() {
        const newNote = {
            id: Date.now(),
            groupId: this.currentGroupId || 'default',
            title: 'Untitled Note',
            content: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes.unshift(newNote);
        this.saveNotes();
        this.updateUI();
        this.openNote(newNote.id);

        // Focus on title input
        setTimeout(() => {
            this.noteTitleInput.focus();
            this.noteTitleInput.select();
        }, 100);
    }

    // Open a note in the editor
    openNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        this.noteTitleInput.value = note.title;
        this.noteContentInput.value = note.content;
        this.updateLastEdited(note.updatedAt);

        // Hide notes view and empty state, show editor
        this.emptyState.style.display = 'none';
        this.notesView.style.display = 'none';
        this.editorContainer.style.display = 'flex';

        // Close mobile sidebar when selecting a note
        this.closeMobileSidebar();
    }

    // Go back to notes list from editor
    backToNotesList() {
        this.currentNoteId = null;

        // Hide editor, show notes view
        this.editorContainer.style.display = 'none';

        if (this.currentGroupId) {
            this.renderNotesInGroup(this.currentGroupId);
        } else {
            this.emptyState.style.display = 'flex';
        }
    }

    // Schedule auto-save (debounced)
    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveCurrentNote();
        }, 500);
    }

    // Save current note
    saveCurrentNote() {
        if (!this.currentNoteId) return;

        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;

        note.title = this.noteTitleInput.value.trim() || 'Untitled Note';
        note.content = this.noteContentInput.value;
        note.updatedAt = new Date().toISOString();

        this.saveNotes();
        this.updateUI();
        this.updateLastEdited(note.updatedAt);
    }

    // Delete current note
    deleteCurrentNote() {
        if (!this.currentNoteId) return;

        const confirmed = confirm('Are you sure you want to delete this note?');
        if (!confirmed) return;

        this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
        this.currentNoteId = null;

        this.saveNotes();
        this.backToNotesList(); // Return to notes list
        this.updateUI(); // Update groups count
    }

    // Update the entire UI
    updateUI() {
        this.renderGroupsList();
        this.updateGroupsCount();

        // Update notes view if a group is selected
        if (this.currentGroupId) {
            this.renderNotesInGroup(this.currentGroupId);
        }
    }

    // Render groups list in sidebar
    renderGroupsList() {
        this.groupsList.innerHTML = '';

        this.groups.forEach(group => {
            const groupItem = this.createGroupItem(group);
            this.groupsList.appendChild(groupItem);
        });
    }

    // Create a single group item element
    createGroupItem(group) {
        const item = document.createElement('div');
        item.className = 'group-item fade-in';
        if (group.id === this.currentGroupId) {
            item.classList.add('active');
        }

        const notesInGroup = this.notes.filter(n => n.groupId === group.id);
        const count = notesInGroup.length;

        item.innerHTML = `
            <div class="group-item-name">${this.escapeHtml(group.name)}</div>
            <div class="group-item-count">${count} ${count === 1 ? 'note' : 'notes'}</div>
        `;

        item.addEventListener('click', () => this.selectGroup(group.id));

        return item;
    }

    // Select a group and show its notes
    selectGroup(groupId) {
        this.currentGroupId = groupId;
        this.renderNotesInGroup(groupId);
        this.renderGroupsList(); // Re-render to update active state
        this.closeMobileSidebar(); // Close sidebar on mobile
    }

    // Render notes in main area for selected group
    renderNotesInGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) return;

        const notesInGroup = this.notes.filter(n => n.groupId === groupId);

        // Update header
        this.notesViewTitle.textContent = group.name;
        this.notesViewCount.textContent = `${notesInGroup.length} ${notesInGroup.length === 1 ? 'note' : 'notes'}`;

        // Hide empty state and editor, show notes view
        this.emptyState.style.display = 'none';
        this.editorContainer.style.display = 'none';
        this.notesView.style.display = 'flex';

        // Render notes grid
        this.notesGrid.innerHTML = '';

        if (notesInGroup.length === 0) {
            this.notesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted);">
                    <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">No notes in this group yet</p>
                    <p style="font-size: 0.875rem;">Click "New Note" to create one!</p>
                </div>
            `;
            return;
        }

        notesInGroup.forEach(note => {
            const noteCard = this.createNoteCard(note);
            this.notesGrid.appendChild(noteCard);
        });
    }

    // Create a note card for the grid
    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card fade-in';

        const preview = note.content.substring(0, 150) || 'No content';
        const formattedDate = this.formatDate(note.updatedAt);

        card.innerHTML = `
            <div class="note-card-title">${this.escapeHtml(note.title)}</div>
            <div class="note-card-preview">${this.escapeHtml(preview)}</div>
            <div class="note-card-date">${formattedDate}</div>
        `;

        card.addEventListener('click', () => this.openNote(note.id));

        return card;
    }

    // Update groups count
    updateGroupsCount() {
        const count = this.groups.length;
        this.groupsCount.textContent = `${count} ${count === 1 ? 'group' : 'groups'}`;
    }

    // Update last edited timestamp
    updateLastEdited(isoDate) {
        const formatted = this.formatDate(isoDate);
        this.lastEdited.textContent = `Last edited: ${formatted} `;
    }

    // Format date to readable string
    formatDate(isoDate) {
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }

    // Mobile sidebar controls
    toggleMobileSidebar() {
        this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
        if (this.isMobileSidebarOpen) {
            this.openMobileSidebar();
        } else {
            this.closeMobileSidebar();
        }
    }

    openMobileSidebar() {
        this.isMobileSidebarOpen = true;
        this.sidebar.classList.add('open');
        this.mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    closeMobileSidebar() {
        this.isMobileSidebarOpen = false;
        this.sidebar.classList.remove('open');
        this.mobileOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore body scroll
    }

    // Touch gesture handlers for swipe
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
    }

    handleTouchMove(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
    }

    handleTouchEnd(e) {
        this.handleSwipeGesture();
    }

    handleSwipeGesture() {
        const swipeThreshold = 50; // Minimum distance for swipe
        const edgeThreshold = 100; // Distance from edge to trigger open swipe
        const diffX = this.touchEndX - this.touchStartX;
        const diffY = this.touchEndY - this.touchStartY;

        // Only handle horizontal swipes (ignore vertical scrolling)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            // Swipe right from left edge → Open sidebar
            if (diffX > 0 && this.touchStartX < edgeThreshold && !this.isMobileSidebarOpen) {
                this.openMobileSidebar();
            }
            // Swipe left when sidebar is open → Close sidebar
            else if (diffX < 0 && this.isMobileSidebarOpen) {
                this.closeMobileSidebar();
            }
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});
