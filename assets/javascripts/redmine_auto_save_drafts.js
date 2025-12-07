document.addEventListener('DOMContentLoaded', function () {
    const storageKeyPrefix = 'redmine-auto-save-drafts';
    const pageKey = location.pathname; // Add the current URL path to the key
    const pendingKeyName = 'redmine-auto-save-drafts-pending';
    let lastSavedTime = null; // Record the last save time

    // ==========================================================
    // Handle cleanup of drafts saved before a submit
    // (Success → remove draft, Reload/Back → keep draft)
    // ==========================================================
    (function cleanupPendingDraft() {
        let raw = sessionStorage.getItem(pendingKeyName);
        if (!raw) return;

        let pending = null;
        try { pending = JSON.parse(raw); } catch (_) {
            sessionStorage.removeItem(pendingKeyName);
            return;
        }
        sessionStorage.removeItem(pendingKeyName);
        if (!pending || !pending.key) return;

        // Navigation type (navigate / reload / back_forward)
        let navType = "navigate";
        try {
            const nav = performance.getEntriesByType("navigation")[0];
            if (nav && nav.type) navType = nav.type;
        } catch (_) {}

        const shouldDelete = (navType === "navigate");
        if (shouldDelete) localStorage.removeItem(pending.key);
    })();

    // Multi-language messages
    const messages = {
        en: {
            saved: "Saved",
            secondsAgo: "seconds ago",
            comment: "Comment",
        },
        ja: {
            saved: "保存済み",
            secondsAgo: "秒前",
            comment: "コメント",
        },
        fr: {
            saved: "Enregistré",
            secondsAgo: "secondes passées",
            comment: "Commentaire",
        },
        // Add more languages as needed
    };

    // Get the browser's language
    const userLang = navigator.language || navigator.userLanguage; // e.g., 'en-US', 'ja'
    const lang = userLang.split('-')[0];
    const message = messages[lang] || messages['en']; // Default to English if unsupported

    function initialize() {
        const context = detectContext();
        if (context && !context.textareas.some((textarea) => textarea.dataset.autoDraftHandled)) {
            setupAutoSaveDrafts(context.textareas, context.storageKey, context.messageTarget);
            context.textareas.forEach((textarea) => (textarea.dataset.autoDraftHandled = true));
        }
    }

    // Detect the context of the page
    function detectContext() {
        const textareas = [];
        let storageKey = null;
        let messageTarget = null;

        if (document.querySelector('#issue_notes')) {
            // Comment edit page
            textareas.push(document.querySelector('#issue_notes'));
            storageKey = `${storageKeyPrefix}-notes-${pageKey}`;
            messageTarget = document.querySelector('#add_notes > legend'); // Message display location for comments
        } else if (document.querySelector('.box.tabular.filedroplistner')) {
            // New ticket creation page
            const description = document.querySelector('#issue_description');
            const subject = document.querySelector('#issue_subject');
            if (description) textareas.push(description);
            if (subject) textareas.push(subject);
            storageKey = `${storageKeyPrefix}-description-and-subject-${pageKey}`;

            // Insert the message next to the "Continue" button
            const continueButton = document.querySelector(
                '#issue-form > input[type="submit"][name="continue"]'
            );
            if (continueButton) {
                messageTarget = continueButton;
            }
        }

        return textareas.length > 0 ? { textareas, storageKey, messageTarget } : null;
    }

    // Set up Auto Save Drafts
    function setupAutoSaveDrafts(textareas, storageKey, messageTarget) {
        const parent = textareas[0].closest('form');

        // Automatically restore saved content
        const savedContent = JSON.parse(localStorage.getItem(storageKey) || '{}');
        if (savedContent && Object.values(savedContent).some((content) => content.trim() !== '')) {
            textareas.forEach((textarea) => {
                const fieldName = textarea.id.replace('issue_', '');
                textarea.value = savedContent[fieldName] || '';
            });
        }

        // Save input content immediately
        textareas.forEach((textarea) => {
            textarea.addEventListener('input', () => {
                const draft = {};
                textareas.forEach((textarea) => {
                    const fieldName = textarea.id.replace('issue_', '');
                    draft[fieldName] = textarea.value;
                });
                localStorage.setItem(storageKey, JSON.stringify(draft));
                lastSavedTime = Date.now();
                updateSaveMessage(messageTarget);
            });
        });

        // Mark draft as "pending delete" (actual delete is on next load)
        parent.addEventListener('submit', () => {
            sessionStorage.setItem(
                pendingKeyName,
                JSON.stringify({ key: storageKey, from: location.href })
            );
        });

        // Update the save time display
        setInterval(() => {
            if (lastSavedTime) {
                updateSaveMessage(messageTarget);
            }
        }, 1000);
    }

    // Update the save message
    function updateSaveMessage(messageTarget) {
        if (!messageTarget) return;

        const secondsAgo = Math.floor((Date.now() - lastSavedTime) / 1000);
        const saveMessage = `${message.saved} (${secondsAgo} ${message.secondsAgo})`;

        if (messageTarget.tagName === 'LEGEND') {
            // For comment edit pages
            messageTarget.innerHTML = `${message.comment} ${saveMessage}`;
        } else {
            // For new ticket creation pages
            const sibling = messageTarget.nextSibling;
            if (sibling && sibling.id === 'save-message') {
                sibling.textContent = saveMessage;
            } else {
                const saveMessageElement = document.createElement('span');
                saveMessageElement.id = 'save-message';
                saveMessageElement.style.marginLeft = '10px';
                saveMessageElement.textContent = saveMessage;
                messageTarget.parentNode.insertBefore(saveMessageElement, messageTarget.nextSibling);
            }
        }
    }

    // Confirm after the DOM is fully loaded
    initialize();

    // Handle dynamically generated textareas
    const observer = new MutationObserver(() => initialize());
    observer.observe(document.body, { childList: true, subtree: true });
});
