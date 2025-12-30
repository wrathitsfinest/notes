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
        this.themeRotation = 0;

        // Touch gesture tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;

        this.initializeElements();
        this.initializeTheme();
        this.loadGroups();
        this.loadNotes();
        this.attachEventListeners();
        i18n.init();
        this.updateUI();
    }

    // Initialize DOM elements
    initializeElements() {
        this.newNoteBtn = document.getElementById('newNoteBtn');
        this.groupsList = document.getElementById('groupsList');
        this.sidebarStats = document.getElementById('sidebarStats');
        this.sidebarHeader = document.getElementById('sidebarHeader');
        this.emptyState = document.getElementById('emptyState');
        this.notesView = document.getElementById('notesView');
        this.appTitle = document.getElementById('appTitle');
        this.appTitleCount = document.getElementById('appTitleCount');
        this.notesGrid = document.getElementById('notesGrid');
        this.editorContainer = document.getElementById('editorContainer');
        this.noteTitleInput = document.getElementById('noteTitleInput');
        this.noteContentInput = document.getElementById('noteContentInput');
        this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
        this.backToNotesBtn = document.getElementById('backToNotesBtn');
        this.editorMenu = document.getElementById('editorMenu');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileOverlay = document.getElementById('mobileOverlay');
        this.sidebar = document.querySelector('.sidebar');
        this.newGroupBtn = document.getElementById('newGroupBtn');
        this.groupSelector = document.getElementById('groupSelector');
        this.themeToggle = document.getElementById('themeToggle');
        this.editGroupBtn = document.getElementById('editGroupBtn');
        this.editNoteBtn = document.getElementById('editNoteBtn');
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsView = document.getElementById('settingsView');
        this.settingsHomeBtn = document.getElementById('settingsHomeBtn');
        this.addCheckboxBtn = document.getElementById('addCheckboxBtn');
        this.modalGroupSection = document.getElementById('modalGroupSection');
        this.languageSelect = document.getElementById('languageSelect');
        this.themeColorPicker = document.getElementById('themeColorPicker');
    }

    // Attach event listeners
    attachEventListeners() {
        this.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.backToNotesBtn.addEventListener('click', () => this.backToNotesList());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        if (this.editGroupBtn) this.editGroupBtn.addEventListener('click', () => this.editCurrentGroup());
        if (this.editNoteBtn) this.editNoteBtn.addEventListener('click', () => this.editCurrentNote());
        this.settingsToggle.addEventListener('click', () => this.openSettings());
        this.settingsHomeBtn.addEventListener('click', () => this.backToMain());
        this.languageSelect.addEventListener('change', (e) => this.handleLanguageChange(e));

        // Theme color picker
        if (this.themeColorPicker) {
            this.themeColorPicker.addEventListener('change', (e) => this.handleThemeColorChange(e));
        }

        // Sidebar Header (All Notes)
        this.sidebarHeader.addEventListener('click', () => this.selectGroup('all'));

        // Group management
        this.newGroupBtn.addEventListener('click', () => this.createNewGroup());

        // Mobile menu
        this.mobileMenuBtn.addEventListener('click', () => this.toggleMobileSidebar());
        this.mobileOverlay.addEventListener('click', () => this.closeMobileSidebar());

        // Touch gestures for swipe
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });

        // Auto-save on input
        this.noteTitleInput.addEventListener('input', () => this.scheduleAutoSave());
        this.noteContentInput.addEventListener('input', () => {
            this.healChecklistStructure();
            this.scheduleAutoSave();
        });

        // Editor specific listeners
        this.addCheckboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleCheckboxAtCursor();
        });
        this.noteContentInput.addEventListener('click', (e) => this.handleEditorClick(e));
        this.noteContentInput.addEventListener('keydown', (e) => this.handleEditorKeyDown(e));

        // Proactive pointer listener to prevent flicker (using Capture phase for maximum speed)
        this.noteContentInput.addEventListener('pointerdown', (e) => {
            const listItem = e.target.closest('.checklist-item');
            if (listItem && !e.target.closest('.line-content')) {
                // If clicking checkbox, let it toggle
                if (e.target.closest('.checklist-checkbox')) return;

                const lineContent = listItem.querySelector('.line-content');
                if (lineContent) {
                    e.preventDefault();
                    this.setCursorToStart(lineContent);
                    lineContent.focus();
                }
            }
        }, true);

        // Selection change listener to keep cursor inside .line-content
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                // If user is selecting text (not just moving caret), don't interfere
                if (!selection.isCollapsed) return;

                const range = selection.getRangeAt(0);
                const node = range.startContainer;

                // Only act if we are inside the note editor
                if (this.noteContentInput.contains(node)) {
                    const listItem = (node.nodeType === 3 ? node.parentNode : node).closest('.checklist-item');
                    if (listItem) {
                        const lineContent = listItem.querySelector('.line-content');
                        // If cursor is NOT inside .line-content, put it inside
                        if (lineContent && !lineContent.contains(node)) {
                            this.setCursorToStart(lineContent);
                        }
                    }
                }
            }
        });

        // Ensure blocks are always DIVs
        document.execCommand('defaultParagraphSeparator', false, 'div');
    }

    // Healing broken checklist structures
    healChecklistStructure() {
        const items = this.noteContentInput.querySelectorAll('.checklist-item');
        items.forEach(item => {
            // If .line-content is missing, the browser likely deleted it during a large selection delete
            if (!item.querySelector('.line-content')) {
                // Collect any stray text nodes or elements that aren't the checkbox
                const fragment = document.createDocumentFragment();
                const checkbox = item.querySelector('.checklist-checkbox');

                Array.from(item.childNodes).forEach(node => {
                    if (node !== checkbox) {
                        fragment.appendChild(node);
                    }
                });

                // Create a new line-content and put the fragments/text back in
                const contentSpan = document.createElement('span');
                contentSpan.className = 'line-content';

                // Use a zero-width space if it's completely empty to maintain focus stability
                if (fragment.childNodes.length === 0) {
                    contentSpan.innerHTML = '\u200B';
                } else {
                    contentSpan.appendChild(fragment);
                }

                item.appendChild(contentSpan);

                // If this was the active element's line, restore cursor
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && item.contains(selection.anchorNode)) {
                    this.setCursorToStart(contentSpan);
                }
            }
        });
    }

    // Initialize Theme
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        // Check local storage or system preference
        if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
            document.documentElement.setAttribute('data-theme', 'light');
            this.updateThemeIcon(true);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.updateThemeIcon(false);
        }

        // Initialize color theme
        const savedColorTheme = localStorage.getItem('colorTheme') || 'cosmic';
        this.setColorTheme(savedColorTheme);
    }

    // Toggle Theme
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Rotate the background outline clockwise
        this.themeRotation += 90;
        this.themeToggle.style.setProperty('--toggle-rotation', `${this.themeRotation}deg`);

        this.updateThemeIcon(newTheme === 'light');
    }

    // Update Theme Icon
    updateThemeIcon(isLight) {
        const iconSpan = this.themeToggle.querySelector('.theme-icon');
        // Show Sun if in Dark Mode (to switch to Light), Moon if in Light Mode (to switch to Dark)
        iconSpan.textContent = isLight ? '🌙' : '☀️';
        this.themeToggle.title = isLight ? i18n.t('switch_to_dark') : i18n.t('switch_to_light');
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

        // Remove default/General group if it exists (we only show user groups now)
        this.groups = this.groups.filter(g => g.id !== 'default');
        this.saveGroups();

        // Set current group to 'all' (Smart View)
        this.currentGroupId = 'all';
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
        // If in "All Notes" view, add to default/General group
        const targetGroupId = (this.currentGroupId === 'all' || !this.currentGroupId) ? 'default' : this.currentGroupId;

        const newNote = {
            id: Date.now(),
            groupId: targetGroupId,
            title: '',
            content: '',
            color: 'none',
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
        // Convert old \n to <br> if no HTML tags found
        const hasTags = /<[a-z][\s\S]*>/i.test(note.content);
        this.noteContentInput.innerHTML = hasTags ? note.content : note.content.replace(/\r\n|\r|\n/g, '<br>');
        this.editorContainer.setAttribute('data-color', note.color || 'none');

        // Populate group selector
        this.populateGroupSelector(note.groupId);

        // Hide notes view and empty state, show editor
        this.emptyState.style.display = 'none';
        this.notesView.style.display = 'none';
        this.settingsView.style.display = 'none';
        this.editorContainer.style.display = 'flex';

        // Show/Hide Header Buttons
        this.editNoteBtn.classList.remove('hidden');
        this.editGroupBtn.classList.add('hidden');

        // Close mobile sidebar when selecting a note
        this.closeMobileSidebar();
    }

    // Populate group selector dropdown
    populateGroupSelector(currentGroupId) {
        this.groupSelector.innerHTML = '';

        // Add "No Category" option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = i18n.t('no_category');
        if (currentGroupId === 'default' || !this.groups.find(g => g.id === currentGroupId)) {
            defaultOption.selected = true;
        }
        this.groupSelector.appendChild(defaultOption);

        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (group.id === currentGroupId) {
                option.selected = true;
            }
            this.groupSelector.appendChild(option);
        });
    }

    // Move current note to a different group
    moveCurrentNote(newGroupId) {
        if (!this.currentNoteId || !newGroupId) return;

        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (note) {
            note.groupId = newGroupId;
            note.updatedAt = new Date().toISOString();
            this.saveNotes();
            this.renderGroupsList();
            this.updateSidebarStats();
        }
    }

    // Go back to notes list from editor
    backToNotesList() {
        this.currentNoteId = null;

        // Hide editor, show notes view
        this.editorContainer.style.display = 'none';

        // Show/Hide Header Buttons
        this.editNoteBtn.classList.add('hidden');
        // Group button visibility handled by renderNotesInGroup

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

        note.title = this.noteTitleInput.value.trim();
        note.content = this.noteContentInput.innerHTML;
        note.updatedAt = new Date().toISOString();

        this.saveNotes();
        // this.updateUI(); // Removed to prevent closing editor on auto-save
    }

    // Toggle checkbox on current line
    toggleCheckboxAtCursor() {
        this.noteContentInput.focus();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let node = range.startContainer;

        // Find the line container
        let line = node.nodeType === 3 ? node.parentNode : node;
        while (line && line !== this.noteContentInput && !line.classList.contains('checklist-item')) {
            if (line.tagName === 'DIV' || line.tagName === 'P') break;
            line = line.parentNode;
        }

        // Ensure we are in a block
        if (!line || line === this.noteContentInput) {
            document.execCommand('formatBlock', false, 'div');
            const newSelection = window.getSelection();
            if (newSelection.rangeCount > 0) {
                line = newSelection.anchorNode;
                if (line.nodeType === 3) line = line.parentNode;
                while (line && line !== this.noteContentInput && line.tagName !== 'DIV') {
                    line = line.parentNode;
                }
            }
        }

        if (!line || line === this.noteContentInput) return;

        // Save relative cursor position
        let savedOffset = 0;
        if (range.startContainer.nodeType === 3) {
            // If in a text node, we need to find its offset relative to the block
            let currentNode = range.startContainer;
            savedOffset = range.startOffset;

            // Go backwards through siblings within the line container (effectively .line-content or the div)
            let sibling = currentNode.previousSibling;
            while (sibling) {
                savedOffset += (sibling.textContent || "").length;
                sibling = sibling.previousSibling;
            }
        }

        if (line.classList.contains('checklist-item')) {
            // Convert back to normal line
            const lineContent = line.querySelector('.line-content');
            let content = lineContent ? lineContent.innerHTML : line.innerHTML;

            const text = (lineContent ? lineContent.textContent : line.textContent).replace(/[\u200B\u200C\u200D\uFEFF\xA0]/g, '').trim();
            if (text === '') {
                content = '<br>';
                savedOffset = 0;
            }

            line.classList.remove('checklist-item', 'checked');
            line.innerHTML = content;

            // Restore cursor position
            this.setCursorToOffset(line, savedOffset);
        } else {
            // Convert to checklist item
            // Use \u200B (Zero-Width Space) as a placeholder - it's invisible but creates a text node for the cursor
            const content = line.innerHTML.trim() === '' || line.innerHTML === '<br>' ? '\u200B' : line.innerHTML;
            line.className = 'checklist-item';
            line.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span class="line-content">${content}</span>`;

            const lineContent = line.querySelector('.line-content');

            // Restore cursor position inside the new content span
            this.setCursorToOffset(lineContent, savedOffset);
        }

        this.saveCurrentNote();
    }

    // Helpers to set cursor position
    setCursorToStart(el) {
        if (!el) return;
        el.focus();
        const selection = window.getSelection();
        const range = document.createRange();

        try {
            // Ensure there is at least a zero-width space to land on if empty
            if (el.innerHTML === '' || el.innerHTML === '<br>') {
                el.innerHTML = '\u200B';
            }

            // Find a valid text node
            let node = el.firstChild;
            while (node && node.nodeType !== 3 && node.firstChild) {
                node = node.firstChild;
            }

            if (node && node.nodeType === 3) {
                range.setStart(node, 0);
            } else {
                range.selectNodeContents(el);
            }

            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.warn('Set cursor failed, falling back to simple focus');
        }
    }

    setCursorToEnd(el) {
        if (!el) return;
        const range = document.createRange();
        const sel = window.getSelection();
        try {
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {
            el.focus();
        }
    }

    // Helper to set cursor at a specific character offset within an element's text content hierarchy
    setCursorToOffset(container, offset) {
        if (!container) return;
        container.focus();
        const selection = window.getSelection();
        const range = document.createRange();

        let currentOffset = 0;
        let targetNode = null;
        let targetOffset = 0;

        // Recursive function to find the text node at the target offset
        const findNode = (node) => {
            if (node.nodeType === 3) { // Text node
                const len = node.textContent.length;
                if (currentOffset + len >= offset) {
                    targetNode = node;
                    targetOffset = offset - currentOffset;
                    return true;
                }
                currentOffset += len;
            } else {
                for (let child of node.childNodes) {
                    if (findNode(child)) return true;
                }
            }
            return false;
        };

        findNode(container);

        try {
            if (targetNode) {
                range.setStart(targetNode, targetOffset);
            } else {
                // If offset is beyond content, just go to the end
                range.selectNodeContents(container);
                range.collapse(false);
            }
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            console.warn('Set offset cursor failed', e);
        }
    }

    // Handle special keys in editor
    handleEditorKeyDown(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // Find the current checklist item
        const listItem = (node.nodeType === 3 ? node.parentNode : node).closest('.checklist-item');

        if (e.key === 'Enter') {
            if (listItem) {
                const lineContent = listItem.querySelector('.line-content');
                if (lineContent) {
                    // Normalize content for check
                    const text = lineContent.textContent.replace(/[\u200B\u200C\u200D\uFEFF\s\xA0]/g, '').trim();

                    // If current line is empty, "untoggle" the checklist
                    if (text === '') {
                        e.preventDefault();
                        listItem.classList.remove('checklist-item', 'checked');
                        // Return to plain text, stripping placeholders
                        let cleanHtml = lineContent.innerHTML.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
                        listItem.innerHTML = (cleanHtml === '' || cleanHtml === '<br>') ? '<br>' : cleanHtml;

                        // Set cursor to end of the newly un-toggled line
                        this.setCursorToEnd(listItem);
                        this.saveCurrentNote();
                        return;
                    }

                    // 2. Perform splitting
                    e.preventDefault();

                    const postRange = range.cloneRange();
                    postRange.selectNodeContents(lineContent);
                    postRange.setStart(range.endContainer, range.endOffset);
                    const contentAfter = postRange.extractContents();

                    // Cleanup current line
                    if (lineContent.innerHTML.replace(/[\u200B\u200C\u200D\uFEFF\s\xA0]/g, '') === '') {
                        lineContent.innerHTML = '\u200B';
                    }

                    // 3. Create new list item
                    const newItem = document.createElement('div');
                    newItem.className = 'checklist-item';
                    newItem.innerHTML = `<span class="checklist-checkbox" contenteditable="false"></span><span class="line-content"></span>`;
                    const newLineContent = newItem.querySelector('.line-content');

                    if (contentAfter.childNodes.length > 0) {
                        newLineContent.appendChild(contentAfter);
                    } else {
                        newLineContent.innerHTML = '\u200B';
                    }

                    listItem.parentNode.insertBefore(newItem, listItem.nextSibling);

                    // 4. Position cursor
                    setTimeout(() => {
                        this.setCursorToStart(newLineContent);
                        newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 0);

                    this.saveCurrentNote();
                }
            }
        } else if (e.key === 'Backspace') {
            if (listItem) {
                const lineContent = listItem.querySelector('.line-content');
                if (lineContent) {
                    // Check if cursor is effectively at the start of the line content
                    const isAtStart = range.startOffset === 0;

                    if (isAtStart) {
                        const text = lineContent.textContent.replace(/[\u200B\u200C\u200D\uFEFF\s\xA0]/g, '').trim();

                        // If empty, remove checklist styling
                        if (text === '') {
                            e.preventDefault();
                            let cleanHtml = lineContent.innerHTML.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').trim();
                            const content = (cleanHtml === '' || cleanHtml === '<br>') ? '<br>' : cleanHtml;
                            listItem.classList.remove('checklist-item', 'checked');
                            listItem.innerHTML = content;

                            // Restore cursor to the start of the now-normal line
                            this.setCursorToStart(listItem);
                            this.saveCurrentNote();
                        }
                    }
                }
            }
        } else if (e.key === 'Delete') {
            // Similar logic for forward delete at the very end of a line content
            // but the main issue is whole-line deletion via CTRL+A + Backspace/Delete.
            // We handle that in the 'input' event for structural healing.
        }
    }

    // Handle clicks inside editor (specifically for checkboxes)
    handleEditorClick(e) {
        if (e.target.classList.contains('checklist-checkbox')) {
            const item = e.target.closest('.checklist-item');
            if (item) {
                item.classList.toggle('checked');
                this.saveCurrentNote();

                // After clicking checkbox, ensure focus stays in content
                const lineContent = item.querySelector('.line-content');
                if (lineContent) {
                    this.setCursorToStart(lineContent);
                }
            }
        } else {
            // Redirect clicks from the checklist-item container or checkbox gap to its content span
            const listItem = e.target.closest('.checklist-item');
            if (listItem && !e.target.closest('.line-content')) {
                const lineContent = listItem.querySelector('.line-content');
                if (lineContent) {
                    e.preventDefault();
                    this.setCursorToStart(lineContent);
                }
            }
        }
    }

    // Edit current note (reusing input modal)
    editCurrentNote() {
        if (!this.currentNoteId) return;
        const note = this.notes.find(n => n.id === this.currentNoteId);
        if (!note) return;

        // Populate and select current group
        this.populateGroupSelector(note.groupId);

        this.showInputModal(i18n.t('note_settings'), null, note.color || 'none', (result) => {
            note.color = result.color;
            if (result.groupId) {
                note.groupId = result.groupId;
            }
            this.saveNotes();
            this.editorContainer.setAttribute('data-color', note.color);
            this.updateUI(); // Update grid preview
        }, () => {
            this.deleteCurrentNote();
        }, i18n.t('delete_note'), true);
    }

    // Delete current note
    deleteCurrentNote() {
        if (!this.currentNoteId) return;

        const confirmed = confirm(i18n.t('confirm_delete_note'));
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
        this.updateSidebarStats();

        // Update notes view if a group is selected
        if (this.currentGroupId) {
            this.renderNotesInGroup(this.currentGroupId);
        }
    }

    // Render groups list in sidebar
    renderGroupsList() {
        this.groupsList.innerHTML = '';

        // Handle Active State for Header (All Notes)
        if (this.currentGroupId === 'all') {
            this.sidebarHeader.classList.add('active');
        } else {
            this.sidebarHeader.classList.remove('active');
        }

        this.groups.forEach(group => {
            const groupItem = this.createGroupItem(group);
            this.groupsList.appendChild(groupItem);
        });
    }

    // Create a single group item element
    createGroupItem(group) {
        const item = document.createElement('div');
        item.className = 'group-item fade-in';
        item.setAttribute('data-color', group.color || 'none');
        if (group.id === this.currentGroupId) {
            item.classList.add('active');
        }

        const notesInGroup = this.notes.filter(n => n.groupId === group.id);
        const count = notesInGroup.length;
        const countText = count + ' ' + (count === 1 ? i18n.t('note_singular') : i18n.t('note_plural'));

        item.innerHTML = `
            <div class="group-item-name">${this.escapeHtml(group.name)}</div>
            <div class="group-item-count">${countText}</div>
        `;

        // Just simple click selection
        item.addEventListener('click', () => this.selectGroup(group.id));

        return item;
    }

    // Create a new group
    // Create a new group
    // Create a new group
    createNewGroup() {
        this.showInputModal(i18n.t('create_new_group'), '', 'none', (result) => {
            if (result.name) {
                const newGroup = {
                    id: 'group_' + Date.now(),
                    name: result.name,
                    color: result.color || 'none',
                    createdAt: new Date().toISOString()
                };
                this.groups.push(newGroup);
                this.saveGroups();
                this.updateUI();
                this.selectGroup(newGroup.id);
            }
        });
    }

    // Delete group with confirmation
    requestDeleteGroup(group) {
        if (group.id === 'default') {
            alert(i18n.t('alert_cannot_delete_default'));
            return;
        }

        if (confirm(i18n.t('confirm_delete_group', { name: group.name }))) {
            this.deleteGroup(group);
            // Close modal by finding it (bit hacky but works for dialog close)
            const modal = document.getElementById('inputModal');
            if (modal && modal.open) modal.close();
        }
    }

    // Delete group
    deleteGroup(group) {
        // Move notes to default group
        let movedCount = 0;
        this.notes.forEach(note => {
            if (note.groupId === group.id) {
                note.groupId = 'default';
                note.updatedAt = new Date().toISOString();
                movedCount++;
            }
        });

        // Remove group
        this.groups = this.groups.filter(g => g.id !== group.id);

        // Save everything
        this.saveNotes();
        this.saveGroups();

        // Reset view
        this.selectGroup('all');

        if (movedCount > 0) {
            alert(i18n.t('alert_group_deleted_moved', { count: movedCount }));
        }
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
        let groupName = '';
        let notesInGroup = [];

        // Determine if this is a custom group that can be edited
        let isCustomGroup = false;

        if (groupId === 'all') {
            groupName = i18n.t('all_notes');
            notesInGroup = this.notes; // Show all notes
        } else if (groupId === 'default') {
            groupName = i18n.t('uncategorized');
            notesInGroup = this.notes.filter(n => n.groupId === 'default');
        } else {
            const group = this.groups.find(g => g.id === groupId);
            if (!group) {
                this.selectGroup('all');
                return;
            }
            groupName = group.name;
            notesInGroup = this.notes.filter(n => n.groupId === groupId);
            isCustomGroup = true;
        }

        // Show/Hide Edit Group Button (Safely)
        if (this.editGroupBtn) {
            if (isCustomGroup) {
                this.editGroupBtn.classList.remove('hidden');
            } else {
                this.editGroupBtn.classList.add('hidden');
            }
        }

        // Ensure note settings are hidden
        if (this.editNoteBtn) this.editNoteBtn.classList.add('hidden');

        // Update header color
        const appHeader = document.querySelector('.app-header');
        const groupColor = (isCustomGroup && this.groups.find(g => g.id === groupId)?.color) || 'none';

        if (groupColor && groupColor !== 'none') {
            appHeader.setAttribute('data-color', groupColor);
        } else {
            appHeader.removeAttribute('data-color');
        }

        // Update header
        this.appTitle.textContent = groupName;
        const countText = notesInGroup.length === 1 ? i18n.t('note_singular') : i18n.t('note_plural');
        this.appTitleCount.textContent = `${notesInGroup.length} ${countText}`;

        // Hide empty state and editor, show notes view
        this.emptyState.style.display = 'none';
        this.editorContainer.style.display = 'none';
        this.settingsView.style.display = 'none';
        this.notesView.style.display = 'flex';

        // Render notes grid
        this.notesGrid.innerHTML = '';

        if (notesInGroup.length === 0) {
            this.notesGrid.innerHTML = `
                <div style="grid-column: 1 / -1; padding: 3rem; text-align: center; color: var(--text-muted);">
                    <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">${i18n.t('no_notes_in_group')}</p>
                    <p style="font-size: 0.875rem;">${i18n.t('click_new_note')}</p>
                </div>
            `;
            return;
        }

        notesInGroup.forEach(note => {
            const noteCard = this.createNoteCard(note);
            this.notesGrid.appendChild(noteCard);
        });
    }

    // Edit current group
    editCurrentGroup() {
        if (!this.currentGroupId || this.currentGroupId === 'all' || this.currentGroupId === 'default') return;

        const group = this.groups.find(g => g.id === this.currentGroupId);
        if (group) {
            this.renameGroup(group);
        }
    }

    // Create a note card for the grid
    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card fade-in';
        card.setAttribute('data-color', note.color || 'none');

        // Strip HTML for preview
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const preview = plainText.substring(0, 150) || i18n.t('no_content');
        const formattedDate = this.formatDate(note.updatedAt);

        const displayTitle = note.title ? note.title : i18n.t('untitled_note');

        card.innerHTML = `
            <div class="note-card-title">${this.escapeHtml(displayTitle)}</div>
            <div class="note-card-preview">${this.escapeHtml(preview)}</div>
            <div class="note-card-date">${formattedDate}</div>
        `;

        card.addEventListener('click', () => this.openNote(note.id));

        return card;
    }

    // Update groups count
    // Update sidebar stats
    updateSidebarStats() {
        const groupsCount = this.groups.length;
        const notesCount = this.notes.length;

        const groupsText = groupsCount === 1 ? i18n.t('group_singular') : i18n.t('group_plural');
        const notesText = notesCount === 1 ? i18n.t('note_singular') : i18n.t('note_plural');

        this.sidebarStats.textContent = i18n.t('sidebar_stats', {
            groups: `${groupsCount} ${groupsText}`,
            notes: `${notesCount} ${notesText}`
        });
    }


    // Format date to readable string
    formatDate(isoDate) {
        const date = new Date(isoDate);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return i18n.t('just_now');
        if (diffMins < 60) return i18n.t(diffMins > 1 ? 'mins_ago' : 'min_ago', { count: diffMins });
        if (diffHours < 24) return i18n.t(diffHours > 1 ? 'hours_ago' : 'hour_ago', { count: diffHours });
        if (diffDays < 7) return i18n.t(diffDays > 1 ? 'days_ago' : 'day_ago', { count: diffDays });

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

    // Settings Navigation
    openSettings() {
        // Hide all other views
        this.emptyState.style.display = 'none';
        this.notesView.style.display = 'none';
        this.editorContainer.style.display = 'none';

        // Show settings view
        this.settingsView.style.display = 'flex';

        // Hide header actions
        if (this.editGroupBtn) this.editGroupBtn.classList.add('hidden');
        if (this.editNoteBtn) this.editNoteBtn.classList.add('hidden');

        // Update title
        this.appTitle.textContent = i18n.t('settings');
        this.appTitleCount.textContent = '';

        // Set current language in selector
        this.languageSelect.value = i18n.currentLang;

        // Set current theme color
        const currentColorTheme = localStorage.getItem('colorTheme') || 'cosmic';
        const themeRadio = this.themeColorPicker.querySelector(`input[value="${currentColorTheme}"]`);
        if (themeRadio) themeRadio.checked = true;

        // Close mobile sidebar if open
        this.closeMobileSidebar();
    }

    handleLanguageChange(e) {
        const newLang = e.target.value;
        i18n.setLanguage(newLang);

        // Only update UI if not in settings view
        const isInSettings = this.settingsView.style.display !== 'none';
        if (!isInSettings) {
            this.updateUI();
        }
    }

    backToMain() {
        this.settingsView.style.display = 'none';
        this.selectGroup('all');
    }

    // Handle theme color change
    handleThemeColorChange(e) {
        if (e.target.name === 'themeColor') {
            const colorTheme = e.target.value;
            this.setColorTheme(colorTheme);
            localStorage.setItem('colorTheme', colorTheme);
        }
    }

    // Set color theme
    setColorTheme(theme) {
        if (theme === 'cosmic') {
            document.documentElement.removeAttribute('data-color-theme');
        } else {
            document.documentElement.setAttribute('data-color-theme', theme);
        }
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

    // Show input modal helper
    // Rename group
    renameGroup(group) {
        if (group.id === 'default') {
            alert(i18n.t('alert_cannot_rename_default'));
            return;
        }

        this.showInputModal(i18n.t('edit_group'), group.name, group.color, (result) => {
            if (result.name) {
                group.name = result.name;
                group.color = result.color;
                this.saveGroups();
                this.updateUI();

                // Update title if viewing this group (and not renamed to something else? Actually object ref suggests direct update is fine but UI update needed)
                if (this.currentGroupId === group.id) {
                    this.appTitle.textContent = group.name;
                }
            }
        }, () => {
            // On Delete Action
            this.requestDeleteGroup(group);
        }, i18n.t('delete_group'));
    }

    showInputModal(title, defaultName, defaultColor, callback, onDelete, deleteLabel = 'Delete', showGroupSelect = false) {
        const modal = document.getElementById('inputModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalInput = document.getElementById('modalInput');
        const inputGroup = modal.querySelector('.input-group');
        const colorGrid = document.getElementById('modalColorGrid');
        const deleteBtn = document.getElementById('modalDeleteBtn');
        const groupSection = document.getElementById('modalGroupSection');

        // Reset state
        modalTitle.textContent = title;
        deleteBtn.textContent = deleteLabel;

        // Show/Hide Group Selection
        if (showGroupSelect) {
            groupSection.classList.remove('hidden');
        } else {
            groupSection.classList.add('hidden');
        }

        // Show/Hide Delete Button
        if (onDelete) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }

        // Setup Delete Handler
        deleteBtn.onclick = () => {
            if (onDelete) onDelete();
        };

        if (defaultName === null) {
            inputGroup.style.display = 'none';
        } else {
            inputGroup.style.display = 'flex';
            modalInput.value = defaultName || '';
        }

        if (defaultColor) {
            const radio = colorGrid.querySelector(`input[value="${defaultColor}"]`);
            if (radio) radio.checked = true;
        } else {
            const radio = colorGrid.querySelector('input[value="none"]');
            if (radio) radio.checked = true;
        }

        const onClose = () => {
            modal.removeEventListener('close', onClose);
            if (modal.returnValue === 'confirm') {
                const selectedColor = colorGrid.querySelector('input:checked')?.value || 'none';
                const selectedGroupId = showGroupSelect ? document.getElementById('groupSelector').value : null;

                callback({
                    name: (defaultName === null) ? null : modalInput.value.trim(),
                    color: selectedColor,
                    groupId: selectedGroupId
                });
            }
        };
        modal.addEventListener('close', onClose);

        modal.returnValue = '';
        modal.showModal();

        // Focus logic
        if (defaultName !== null) {
            setTimeout(() => {
                modalInput.focus();
                modalInput.select();
            }, 50);
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
