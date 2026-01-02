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
        const iconContainer = this.themeToggle.querySelector('.theme-icon');

        const moonSvg = `
            <svg version="1.1" viewBox="0 0 512 512" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" class="theme-svg moon-icon">
                <g>
                    <g>
                        <path style="fill:#F4F4F5;" d="M426.655,444.491c-85.064,74.278-206.9,83.839-299.319,29.581
                            c-22.308-13.074-42.982-29.907-60.958-50.499C56,411.723,46.93,399.058,39.085,385.82C15.143,345.045,3.539,298.958,3.784,252.953
                            c0.49-71.582,29.989-142.754,87.026-192.6C138.776,18.433,197.855-1.096,256.69,0.047c45.597,0.817,91.03,13.973,131.069,38.733
                            c22.063,13.564,42.41,30.724,60.305,51.153c9.724,11.114,18.386,22.799,25.822,34.974
                            C537.623,227.785,521.117,361.878,426.655,444.491z"/>
                        <path style="fill:#EDEDEC;" d="M107.7,89.244c99.915-87.35,248.817-74.175,333.815,23.051
                            c84.998,97.226,75.388,243.379-24.528,330.729c-99.915,87.35-251.727,82.317-336.725-14.908S7.784,176.594,107.7,89.244z"/>
                        <g>
                            <path style="fill:#D8D8D8;" d="M244.029,141.49c-17.92,37.27-63.032,51.341-100.302,33.421
                                c-37.27-17.92-53.234-61.357-35.315-98.627c17.92-37.27,62.835-54.046,100.105-36.126
                                C245.787,58.078,261.948,104.22,244.029,141.49z"/>
                            <path style="opacity:0.06;fill:#040000;" d="M128.086,97.65c17.92-37.27,62.835-54.046,100.105-36.126
                                c4.127,1.984,7.994,4.316,11.586,6.942c-7.335-11.909-17.95-21.909-31.26-28.308c-37.27-17.92-82.185-1.144-100.105,36.126
                                c-15.805,32.872-5.247,70.538,23.036,91.265C118.963,147.091,116.789,121.146,128.086,97.65z"/>
                        </g>
                        <path style="fill:#D8D8D8;" d="M217.121,218.367c-1.17-5.733,2.71-11.178,8.442-12.348c5.733-1.17,11.248,2.359,12.418,8.091
                            c1.17,5.733-2.456,11.466-8.189,12.635C224.06,227.916,218.291,224.099,217.121,218.367z"/>
                        <path style="opacity:0.5;fill:#FFFFFF;" d="M363.151,96.945c-1.17-5.733,2.71-11.178,8.442-12.348s11.248,2.359,12.418,8.091
                            c1.17,5.733-2.456,11.466-8.189,12.636C370.089,106.493,364.32,102.677,363.151,96.945z"/>
                        <path style="fill:#D8D8D8;" d="M282.752,398.389c8.691-7.598,21.813-6.256,29.411,2.435c7.598,8.691,6.926,21.591-1.765,29.189
                            c-8.691,7.598-22.059,6.972-29.657-1.719C273.143,419.603,274.061,405.987,282.752,398.389z"/>
                        <path style="opacity:0.5;fill:#FFFFFF;" d="M58.327,220.961c-1.17-5.733,2.71-11.178,8.442-12.348
                            c5.733-1.17,11.248,2.359,12.418,8.091s-2.456,11.466-8.189,12.636C65.265,230.51,59.496,226.694,58.327,220.961z"/>
                        <path style="fill:#D8D8D8;" d="M468.947,281.701c-3.725,36.649-37.256,62.098-73.905,58.373
                            c-36.649-3.725-63.177-35.279-59.452-71.928c3.725-36.649,36.272-64.305,72.921-60.58
                            C445.16,211.292,472.673,245.052,468.947,281.701z"/>
                        <g>
                            <path style="fill:#D8D8D8;" d="M173.239,331.136c14.631,25.328,4.867,57.294-20.461,71.925
                                c-25.328,14.631-57.07,6.642-71.701-18.686c-14.631-25.328-6.526-58.257,18.802-72.888
                                C125.206,296.855,158.608,305.808,173.239,331.136z"/>
                            <path style="opacity:0.06;fill:#040000;" d="M112.818,324.329c18.464-10.666,41.21-8.787,57.855,2.82
                                c-15.693-22.238-46.847-29.497-70.794-15.663c-25.328,14.631-33.433,47.561-18.802,72.888c4.04,6.993,9.388,12.657,15.541,16.895
                                c-0.915-1.299-1.788-2.644-2.602-4.052C79.385,371.89,87.49,338.96,112.818,324.329z"/>
                        </g>
                        <path style="opacity:0.06;fill:#040000;" d="M349.701,282.093c3.725-36.649,36.272-64.305,72.921-60.579
                            c12.217,1.242,23.415,5.824,32.783,12.735c-11.007-14.534-27.694-24.73-46.893-26.682c-36.649-3.725-69.196,23.93-72.921,60.579
                            c-2.465,24.247,8.316,46.261,26.506,59.464C352.777,315.06,347.969,299.128,349.701,282.093z"/>
                    </g>
                    <path style="opacity:0.1;fill:#040000;" d="M254.81,381.707c-105.358,0-198.419-52.064-254.72-131.654
                        c-2.703,99.72,55.552,194.334,153.936,236.742c128.773,55.507,279.648,1.534,335.155-127.239
                        c15.267-35.419,21.657-72.747,20.288-109.416C453.162,329.68,360.13,381.707,254.81,381.707z"/>
                </g>
            </svg>
        `;

        const sunSvg = `
            <svg version="1.1" viewBox="0 0 512 512" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" class="theme-svg sun-icon">
                <g>
                    <path style="fill:#FFDA44;" d="M255.652,135.885c-4.33,0-7.84-3.51-7.84-7.84V7.84c0-4.33,3.51-7.84,7.84-7.84
                        c4.329,0,7.84,3.51,7.84,7.84v120.206C263.491,132.375,259.981,135.885,255.652,135.885z"/>
                    <path style="fill:#FFDA44;" d="M170.82,171.312c-3.062,3.062-8.026,3.062-11.087,0L74.735,86.314
                        c-3.062-3.062-3.062-8.026,0-11.087c3.062-3.062,8.026-3.062,11.087,0l84.998,84.998
                        C173.881,163.287,173.881,168.251,170.82,171.312z"/>
                    <path style="fill:#FFDA44;" d="M135.885,256.348c0,4.329-3.51,7.84-7.84,7.84H7.84c-4.33,0-7.84-3.51-7.84-7.84
                        c0-4.33,3.51-7.84,7.84-7.84h120.206C132.375,248.509,135.885,252.019,135.885,256.348z"/>
                    <path style="fill:#FFDA44;" d="M171.312,341.181c3.062,3.062,3.062,8.026,0,11.087l-84.998,84.998
                        c-3.062,3.062-8.026,3.062-11.087,0c-3.062-3.062-3.062-8.026,0-11.087l84.998-84.998
                        C163.287,338.119,168.251,338.119,171.312,341.181z"/>
                    <path style="fill:#FFDA44;" d="M256.348,376.115c4.329,0,7.84,3.51,7.84,7.84V504.16c0,4.329-3.51,7.84-7.84,7.84
                        c-4.33,0-7.84-3.51-7.84-7.84V383.955C248.509,379.625,252.019,376.115,256.348,376.115z"/>
                    <path style="fill:#FFDA44;" d="M341.181,340.688c3.062-3.062,8.026-3.062,11.087,0l84.998,84.998c3.062,3.062,3.062,8.026,0,11.087
                        c-3.062,3.062-8.026,3.062-11.087,0l-84.998-84.998C338.119,348.713,338.119,343.749,341.181,340.688z"/>
                    <path style="fill:#FFDA44;" d="M376.115,255.652c0-4.33,3.51-7.84,7.84-7.84H504.16c4.329,0,7.84,3.51,7.84,7.84
                        c0,4.329-3.51,7.84-7.84,7.84H383.955C379.625,263.491,376.115,259.981,376.115,255.652z"/>
                    <path style="fill:#FFDA44;" d="M340.688,170.82c-3.062-3.062-3.062-8.026,0-11.087l84.998-84.998c3.062-3.062,8.026-3.062,11.087,0
                        c3.062,3.062,3.062,8.026,0,11.087l-84.998,84.998C348.713,173.881,343.749,173.881,340.688,170.82z"/>
                </g>
                <g>
                    <path style="fill:#FFEB99;" d="M192.356,111.371c-3.076,0-5.995-1.822-7.246-4.842l-7.439-17.958
                        c-1.657-4,0.242-8.586,4.243-10.243c4-1.655,8.586,0.243,10.243,4.243l7.439,17.958c1.657,4-0.242,8.586-4.243,10.243
                        C194.371,111.179,193.355,111.371,192.356,111.371z"/>
                    <path style="fill:#FFEB99;" d="M171.101,60.059c-3.076,0-5.996-1.823-7.246-4.842l-10.613-25.622
                        c-1.657-4,0.243-8.586,4.243-10.243c3.999-1.657,8.587,0.243,10.243,4.243l10.613,25.622c1.657,4-0.242,8.586-4.243,10.243
                        C173.116,59.866,172.1,60.059,171.101,60.059z"/>
                    <path style="fill:#FFEB99;" d="M102.829,200.89c-1,0-2.015-0.192-2.997-0.599l-76.935-31.867c-4-1.657-5.899-6.243-4.243-10.243
                        c1.657-4,6.24-5.899,10.243-4.243l76.935,31.867c4,1.657,5.899,6.243,4.243,10.243C108.825,199.067,105.906,200.89,102.829,200.89z
                        "/>
                    <path style="fill:#FFEB99;" d="M56.239,346.79c-3.076,0-5.996-1.823-7.246-4.842c-1.657-4,0.243-8.586,4.243-10.243l46.597-19.301
                        c4.001-1.655,8.586,0.244,10.243,4.243c1.657,4-0.243,8.586-4.243,10.243l-46.597,19.301
                        C58.255,346.598,57.239,346.79,56.239,346.79z"/>
                    <path style="fill:#FFEB99;" d="M25.901,359.357c-3.076,0-5.996-1.823-7.246-4.842c-1.657-4,0.243-8.586,4.243-10.243l6.655-2.756
                        c4-1.657,8.586,0.243,10.243,4.243c1.657,4-0.243,8.586-4.243,10.243l-6.655,2.756C27.917,359.165,26.901,359.357,25.901,359.357z"
                        />
                    <path style="fill:#FFEB99;" d="M189.847,423.051c-1,0-2.016-0.192-2.997-0.599c-4-1.657-5.9-6.243-4.243-10.243l2.502-6.041
                        c1.657-4,6.242-5.901,10.243-4.243c4,1.658,5.9,6.243,4.243,10.243l-2.502,6.041C195.842,421.228,192.923,423.051,189.847,423.051z
                        "/>
                    <path style="fill:#FFEB99;" d="M160.481,493.943c-1,0-2.015-0.192-2.997-0.599c-4-1.657-5.9-6.243-4.243-10.243l17.703-42.738
                        c1.657-4,6.244-5.898,10.243-4.243c4,1.657,5.899,6.243,4.243,10.243l-17.703,42.738
                        C166.477,492.121,163.557,493.943,160.481,493.943z"/>
                    <path style="fill:#FFEB99;" d="M350.822,493.943c-3.076,0-5.996-1.823-7.246-4.842l-31.867-76.934
                        c-1.657-4,0.242-8.586,4.243-10.243c4-1.655,8.586,0.244,10.243,4.243l31.867,76.934c1.657,4-0.242,8.586-4.243,10.243
                        C352.838,493.751,351.822,493.943,350.822,493.943z"/>
                    <path style="fill:#FFEB99;" d="M432.705,337.529c-1,0-2.016-0.192-2.997-0.599l-24.237-10.039c-4-1.657-5.9-6.243-4.243-10.243
                        c1.657-4,6.244-5.9,10.243-4.243l24.237,10.039c4,1.657,5.9,6.243,4.243,10.243C438.699,335.706,435.78,337.529,432.705,337.529z"
                        />
                    <path style="fill:#FFEB99;" d="M485.402,359.357c-1,0-2.015-0.192-2.997-0.599l-23.536-9.749c-4-1.657-5.9-6.243-4.243-10.243
                        c1.656-4,6.241-5.898,10.243-4.243l23.536,9.749c4,1.657,5.9,6.243,4.243,10.243C491.398,357.534,488.478,359.357,485.402,359.357z"
                        />
                    <path style="fill:#FFEB99;" d="M408.473,200.89c-3.076,0-5.996-1.823-7.246-4.842c-1.657-4,0.243-8.586,4.243-10.243l42.692-17.683
                        c4-1.657,8.586,0.243,10.243,4.243c1.657,4-0.242,8.586-4.243,10.243l-42.692,17.683C410.49,200.698,409.474,200.89,408.473,200.89
                        z"/>
                    <path style="fill:#FFEB99;" d="M478.653,171.821c-3.076,0-5.996-1.823-7.246-4.842c-1.657-4,0.242-8.586,4.243-10.243l6.756-2.798
                        c4-1.658,8.586,0.243,10.243,4.243c1.657,4-0.242,8.586-4.243,10.243l-6.756,2.798
                        C480.669,171.629,479.652,171.821,478.653,171.821z"/>
                    <path style="fill:#FFEB99;" d="M318.948,111.371c-1,0-2.016-0.192-2.997-0.599c-4-1.657-5.9-6.243-4.243-10.243l31.867-76.935
                        c1.657-4.001,6.242-5.899,10.243-4.243c4,1.657,5.9,6.243,4.243,10.243l-31.867,76.935
                        C324.944,109.548,322.024,111.371,318.948,111.371z"/>
                    <circle style="fill:#FFEB99;" cx="262.352" cy="256.091" r="148.94"/>
                </g>
                <g>
                    <path style="fill:#FFDA44;" d="M166.905,256.091c0-73.127,52.701-133.942,122.194-146.544c-8.678-1.574-17.617-2.4-26.748-2.4
                        c-82.26,0-148.944,66.684-148.944,148.944s66.684,148.944,148.944,148.944c9.131,0,18.071-0.826,26.748-2.4
                        C219.607,390.033,166.905,329.218,166.905,256.091z"/>
                    <path style="fill:#FFDA44;" d="M367.456,300.387c-0.807,0-1.629-0.125-2.438-0.39c-4.115-1.345-6.36-5.772-5.016-9.887
                        c3.58-10.952,5.395-22.398,5.395-34.019c0-4.329,3.51-7.84,7.84-7.84s7.84,3.51,7.84,7.84c0,13.279-2.076,26.364-6.17,38.89
                        C373.825,298.287,370.755,300.387,367.456,300.387z"/>
                    <path style="fill:#FFDA44;" d="M281.708,378.606c-3.579,0-6.811-2.467-7.638-6.104c-0.96-4.223,1.686-8.423,5.908-9.381
                        c24.888-5.654,47.207-20.014,62.847-40.436c2.634-3.437,7.555-4.09,10.991-1.458c3.438,2.633,4.09,7.553,1.458,10.991
                        c-17.863,23.324-43.369,39.729-71.822,46.193C282.869,378.542,282.284,378.606,281.708,378.606z"/>
                </g>
            </svg>
        `;

        // Show Sun if in Light Mode, Moon if in Dark Mode
        iconContainer.innerHTML = isLight ? sunSvg : moonSvg;
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

        // Close modal if open
        const modal = document.getElementById('inputModal');
        if (modal && modal.open) modal.close();
    }

    // Update the entire UI
    updateUI() {
        this.renderGroupsList();
        this.updateSidebarStats();

        // Update notes view if a group is selected
        if (this.currentGroupId) {
            // Check if we are currently in editor or settings view
            const isEditorVisible = this.editorContainer.style.display === 'flex';
            const isSettingsVisible = this.settingsView.style.display === 'flex';

            // If in editor or settings, update the grid in background but don't switch view
            this.renderNotesInGroup(this.currentGroupId, isEditorVisible || isSettingsVisible);
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
    renderNotesInGroup(groupId, skipViewSwitch = false) {
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

        if (!skipViewSwitch) {
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
        }

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
