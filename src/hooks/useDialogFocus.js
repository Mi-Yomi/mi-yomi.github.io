import { useEffect } from 'react';

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps keyboard focus inside a full-screen overlay and restores it to the
 * control that opened the overlay. The dialog ref remains owned by the caller
 * so it can also be used for scrolling and layout work.
 */
export default function useDialogFocus(open, dialogRef, initialFocusRef) {
    useEffect(() => {
        if (!open || !dialogRef.current) return undefined;

        const dialog = dialogRef.current;
        const previouslyFocused = document.activeElement;
        const focusInitial = () => {
            const target = initialFocusRef?.current || dialog.querySelector(FOCUSABLE) || dialog;
            target?.focus?.({ preventScroll: true });
        };
        const frame = requestAnimationFrame(focusInitial);

        const onKeyDown = (event) => {
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((element) => {
                const style = window.getComputedStyle(element);
                return !element.closest('[inert]') && style.visibility !== 'hidden' && style.display !== 'none';
            });

            if (controls.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        dialog.addEventListener('keydown', onKeyDown);
        return () => {
            cancelAnimationFrame(frame);
            dialog.removeEventListener('keydown', onKeyDown);
            if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
                previouslyFocused.focus({ preventScroll: true });
            }
            if (document.activeElement === document.body || document.activeElement === dialog) {
                const currentNavItem = Array.from(document.querySelectorAll('[aria-current="page"]'))
                    .find((element) => element instanceof HTMLElement && element.getClientRects().length > 0 && !element.closest('[inert]'));
                currentNavItem?.focus?.({ preventScroll: true });
            }
        };
    }, [open, dialogRef, initialFocusRef]);
}
