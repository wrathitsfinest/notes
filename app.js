// ============================================
// Notes App - Main JavaScript
// ============================================

class NotesApp {
    constructor() {
        this.notes = [];
        this.currentNoteId = null;
        this.autoSaveTimeout = null;
        this.isMobileSidebarOpen = false;

        // Touch gesture tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        this.initializeElements();
        this.loadNotes();
        this.attachEventListeners();
        this.updateUI();
    }

    // Initialize DOM elements
    initializeElements() {
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.notesList = document.getElementById('notesList');
        this.notesCount = document.getElementById('notesCount');
        this.emptyState = document.getElementById('emptyState');
        this.editorContainer = document.getElementById('editorContainer');
        this.noteTitleInput = document.getElementById('noteTitleInput');
        this.noteContentInput = document.getElementById('noteContentInput');
        this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
        this.lastEdited = document.getElementById('lastEdited');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.sidebar = document.querySelector('.sidebar');
    }

    // Attach event listeners
    attachEventListeners() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());

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

        // Show editor, hide empty state
        this.emptyState.style.display = 'none';
        this.editorContainer.style.display = 'flex';

        // Close mobile sidebar when selecting a note
        this.closeMobileSidebar();

        // Update active state in sidebar
        this.updateUI();
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
        this.closeEditor();
        this.updateUI();
    }

    // Close editor
    closeEditor() {
        this.emptyState.style.display = 'flex';
        this.editorContainer.style.display = 'none';
        this.noteTitleInput.value = '';
        this.noteContentInput.value = '';
        this.currentNoteId = null;
    }

    // Update the entire UI
    updateUI() {
        this.renderNotesList();
        this.updateNotesCount();
    }

    // Render notes list in sidebar
    renderNotesList() {
        this.notesList.innerHTML = '';

        if (this.notes.length === 0) {
            this.notesList.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted);">
                    <p>No notes yet.</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Click "New Note" to get started!</p>
                </div>
            `;
            return;
        }

        this.notes.forEach(note => {
            const noteItem = this.createNoteItem(note);
            this.notesList.appendChild(noteItem);
        });
    }

    // Create a single note item element
    createNoteItem(note) {
        const item = document.createElement('div');
        item.className = 'note-item fade-in';
        if (note.id === this.currentNoteId) {
            item.classList.add('active');
        }

        const preview = note.content.substring(0, 100) || 'No content';
        const formattedDate = this.formatDate(note.updatedAt);

        item.innerHTML = `
            <div class="note-item-title">${this.escapeHtml(note.title)}</div>
            <div class="note-item-preview">${this.escapeHtml(preview)}</div>
            <div class="note-item-date">${formattedDate}</div>
        `;

        item.addEventListener('click', () => this.openNote(note.id));

        return item;
    }

    // Update notes count
    updateNotesCount() {
        const count = this.notes.length;
        this.notesCount.textContent = `${count} ${count === 1 ? 'note' : 'notes'}`;
    }

    // Update last edited timestamp
    updateLastEdited(isoDate) {
        const formatted = this.formatDate(isoDate);
        this.lastEdited.textContent = `Last edited: ${formatted}`;
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
