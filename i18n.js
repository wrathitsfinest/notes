// ============================================
// Notes App - Internationalization (i18n)
// ============================================

const i18n = {
    currentLang: localStorage.getItem('language') || 'en',
    translations: {
        en: {
            // App Info
            app_title: "My Notes",
            app_title_full: "Notes - Your Personal Note-Taking App",
            app_description: "A beautiful and simple note-taking application to capture your thoughts and ideas.",

            // Sidebar & Navigation
            all_notes: "All Notes",
            uncategorized: "Uncategorized",
            new_group: "New Group",
            new_note: "New Note",
            no_category: "No Category",

            // Stats
            note_singular: "note",
            note_plural: "notes",
            group_singular: "group",
            group_plural: "groups",
            sidebar_stats: "{groups} / {notes}",

            // States
            empty_state_title: "No Group Selected",
            empty_state_text: "Select a group from the sidebar to view its notes.",
            no_notes_in_group: "No notes in this group yet",
            click_new_note: "Click \"New Note\" to create one!",
            untitled_note: "Untitled Note",
            no_content: "No content",

            // Settings
            settings: "Settings",
            general_settings: "General Settings",
            settings_coming_soon: "Settings functionality coming soon...",
            language: "Language",

            // Editor
            note_title_placeholder: "Note Title",
            note_content_placeholder: "Start typing your note...",
            back_to_notes: "Back to notes",
            back_to_main: "Back to main",

            // Tooltips & Aria
            toggle_menu: "Toggle menu",
            toggle_theme_title: "Toggle Theme",
            toggle_theme_aria: "Toggle Dark/Light Mode",
            switch_to_dark: "Switch to Dark Mode",
            switch_to_light: "Switch to Light Mode",
            toggle_checkbox: "Toggle Checkbox",
            note_settings: "Note Settings",
            group_settings: "Group Settings",

            // Modals & Actions
            edit_group: "Edit Group",
            create_new_group: "Create New Group",
            enter_value: "Enter Value",
            modal_name_placeholder: "Name",
            label_category: "Category",
            label_color: "Color",
            delete_group: "Delete Group",
            delete_note: "Delete Note",
            cancel: "Cancel",
            save: "Save",

            // Date Relative
            just_now: "Just now",
            mins_ago: "{count} mins ago",
            min_ago: "{count} min ago",
            hours_ago: "{count} hours ago",
            hour_ago: "{count} hour ago",
            days_ago: "{count} days ago",
            day_ago: "{count} day ago",

            // Dialogs & Alerts
            confirm_delete_note: "Are you sure you want to delete this note?",
            confirm_delete_group: "Delete group \"{name}\"? Notes will be moved to \"All Notes\".",
            alert_cannot_delete_default: "Cannot delete the default group.",
            alert_cannot_rename_default: "Cannot rename the default group.",
            alert_group_deleted_moved: "Group deleted. {count} notes moved to \"All Notes\"."
        },
        ru: {
            // App Info
            app_title: "Мои заметки",
            app_title_full: "Заметки - Ваше личное приложение для записей",
            app_description: "Красивое и простое приложение для заметок, чтобы сохранять ваши мысли и идеи.",

            // Sidebar & Navigation
            all_notes: "Все заметки",
            uncategorized: "Без категории",
            new_group: "Новая группа",
            new_note: "Новая заметка",
            no_category: "Без категории",

            // Stats
            note_singular: "заметка",
            note_plural: "заметок",
            group_singular: "группа",
            group_plural: "групп",
            sidebar_stats: "{groups} / {notes}",

            // States
            empty_state_title: "Группа не выбрана",
            empty_state_text: "Выберите группу на боковой панели, чтобы просмотреть заметки.",
            no_notes_in_group: "В этой группе пока нет заметок",
            click_new_note: "Нажмите \"Новая заметка\", чтобы создать её!",
            untitled_note: "Заметка без названия",
            no_content: "Нет содержимого",

            // Settings
            settings: "Настройки",
            general_settings: "Общие настройки",
            settings_coming_soon: "Функционал настроек скоро появится...",
            language: "Язык",

            // Editor
            note_title_placeholder: "Заголовок",
            note_content_placeholder: "Начните писать заметку...",
            back_to_notes: "Назад к заметкам",
            back_to_main: "На главную",

            // Tooltips & Aria
            toggle_menu: "Переключить меню",
            toggle_theme_title: "Сменить тему",
            toggle_theme_aria: "Переключить темную/светлую тему",
            switch_to_dark: "Перейти на темную тему",
            switch_to_light: "Перейти на светлую тему",
            toggle_checkbox: "Список дел",
            note_settings: "Настройки заметки",
            group_settings: "Настройки группы",

            // Modals & Actions
            edit_group: "Изменить группу",
            create_new_group: "Создать группу",
            enter_value: "Введите значение",
            modal_name_placeholder: "Название",
            label_category: "Категория",
            label_color: "Цвет",
            delete_group: "Удалить группу",
            delete_note: "Удалить заметку",
            cancel: "Отмена",
            save: "Сохранить",

            // Date Relative
            just_now: "Только что",
            mins_ago: "{count} мин. назад",
            min_ago: "{count} мин. назад",
            hours_ago: "{count} ч. назад",
            hour_ago: "{count} ч. назад",
            days_ago: "{count} дн. назад",
            day_ago: "{count} д. назад",

            // Dialogs & Alerts
            confirm_delete_note: "Вы уверены, что хотите удалить эту заметку?",
            confirm_delete_group: "Удалить группу \"{name}\"? Заметки будут перемещены в \"Все заметки\".",
            alert_cannot_delete_default: "Нельзя удалить стандартную группу.",
            alert_cannot_rename_default: "Нельзя переименовать стандартную группу.",
            alert_group_deleted_moved: "Группа удалена. {count} заметок перемещено в \"Все заметки\"."
        }
    },

    // Get translation for key
    t(key, params = {}) {
        const langData = this.translations[this.currentLang] || this.translations['en'];
        let text = langData[key] || key;

        // Replace parameters like {count}
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    },

    // Set current language and save to localStorage
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.init();
        }
    },

    // Automatically translate DOM elements with data-i18n attribute
    init() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.hasAttribute('title') && el.getAttribute('data-i18n-target') === 'title') {
                el.title = translation;
            } else if (el.hasAttribute('aria-label') && el.getAttribute('data-i18n-target') === 'aria') {
                el.setAttribute('aria-label', translation);
            } else {
                el.textContent = translation;
            }
        });

        // Update Title and Meta
        document.title = this.t('app_title_full');
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = this.t('app_description');

        // Update html lang attribute
        document.documentElement.lang = this.currentLang;
    }
};

// Export to window
window.i18n = i18n;
