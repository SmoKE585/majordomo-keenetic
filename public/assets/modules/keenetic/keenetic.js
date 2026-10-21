/*
 * Keenetic module page behaviour.
 *
 * The pages are server-rendered. This file only adds the small interactive
 * layer that cannot be expressed with HTML: immediate connection toggles,
 * auto-submitted filters and copy buttons. It has no jQuery dependency and is
 * re-initialised after `partLoad` through MDJAdminUI.
 */
(function (window, document) {
    'use strict';

    function toast(type, title, text) {
        if (window.MDJUIToast && typeof window.MDJUIToast.show === 'function') {
            window.MDJUIToast.show({ type: type, title: title, text: text || '' });
        }
    }

    function closest(element, selector) {
        return element && element.closest ? element.closest(selector) : null;
    }

    function setStatus(node, state, label) {
        if (!node) {
            return;
        }
        node.className = node.className
            .split(/\s+/)
            .filter(function (name) {
                return name !== '' && name.indexOf('md-status--') !== 0;
            })
            .join(' ');
        node.classList.add('md-status--' + state);
        var labelNode = node.querySelector('.md-status__label');
        if (labelNode) {
            labelNode.textContent = label;
        }
        node.setAttribute('aria-label', label);
    }

    function toggleConnection(checkbox) {
        if (!checkbox || checkbox.disabled) {
            return;
        }
        var id = checkbox.getAttribute('data-keenetic-connection');
        if (!id) {
            return;
        }
        var cell = closest(checkbox, '[data-keenetic-connection-cell]') || closest(checkbox, 'td') || checkbox.parentNode;
        var label = cell ? cell.querySelector('[data-keenetic-connection-label]') : null;
        var status = cell ? cell.querySelector('[data-keenetic-connection-status]') : null;
        var row = closest(checkbox, '[data-md-row]');

        checkbox.disabled = true;
        cell && cell.classList.add('is-loading');

        fetch('?view_mode=toggle_connection&id=' + encodeURIComponent(id) + '&ajax=1', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                if (!data || typeof data.state === 'undefined') {
                    throw new Error('bad response');
                }
                checkbox.checked = Number(data.state) === 1;
                if (label) {
                    label.textContent = data.admin_label || (checkbox.checked ? 'Включено' : 'Выключено');
                }
                if (status) {
                    setStatus(status, data.status ? 'online' : (data.state ? 'error' : 'idle'), data.link_label || '');
                }
                if (row) {
                    row.setAttribute('data-link', data.status ? 'online' : (data.state ? 'error' : 'idle'));
                }
                toast('success', 'Подключение', (data.link_label || 'Состояние изменено') + '.');
            })
            .catch(function () {
                checkbox.checked = !checkbox.checked;
                toast('danger', 'Не удалось переключить подключение', 'Проверьте связь с роутером и повторите попытку.');
            })
            .finally(function () {
                checkbox.disabled = false;
                cell && cell.classList.remove('is-loading');
            });
    }

    function initConnectionToggles() {
        if (document.documentElement.dataset.mdKeeneticConnectionsReady === '1') {
            return;
        }
        document.documentElement.dataset.mdKeeneticConnectionsReady = '1';
        document.addEventListener('change', function (event) {
            var checkbox = event.target;
            if (!checkbox || !checkbox.matches || !checkbox.matches('[data-keenetic-connection]')) {
                return;
            }
            toggleConnection(checkbox);
        });
    }

    function initAutoSubmit(root) {
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('[data-keenetic-autosubmit]').forEach(function (select) {
            if (select.dataset.mdKeeneticAutosubmitReady === '1') {
                return;
            }
            select.dataset.mdKeeneticAutosubmitReady = '1';
            select.addEventListener('change', function () {
                var form = closest(select, 'form');
                if (!form) {
                    return;
                }
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.submit();
                }
            });
        });
    }

    function initCopyButtons(root) {
        var scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('[data-keenetic-copy]').forEach(function (button) {
            if (button.dataset.mdKeeneticCopyReady === '1') {
                return;
            }
            button.dataset.mdKeeneticCopyReady = '1';
            button.addEventListener('click', function () {
                var value = button.getAttribute('data-keenetic-copy');
                if (!value) {
                    return;
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(value).then(function () {
                        toast('success', 'Скопировано', value);
                    }).catch(function () {
                        toast('warning', 'Не удалось скопировать', value);
                    });
                } else {
                    toast('info', 'Значение', value);
                }
            });
        });
    }

    function init(root) {
        initConnectionToggles();
        initAutoSubmit(root);
        initCopyButtons(root);
    }

    if (window.MDJAdminUI && typeof window.MDJAdminUI.registerModuleUI === 'function') {
        window.MDJAdminUI.registerModuleUI('keenetic', { init: init });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            init(document);
        });
    } else {
        init(document);
    }
})(window, document);
