# macOS Spaces & Chrome — Focused Chat

Use this file as a dedicated, focused "chat" or guide about macOS Spaces, multi-monitor fullscreen behavior, and Chrome window issues. You can edit it, add questions, or copy sections into a new chat thread.

---

## Quick Summary
- macOS Spaces are virtual desktops. Full-screen apps create a dedicated Space.
- If "Displays have separate Spaces" is off, a full-screen app can blank other displays.
- Chrome windows may end up in different Spaces due to app assignments or automatic space rearrangement.

## Goal
Help you keep one app (e.g. VS Code) full-screen on one monitor while using other apps (Chrome, Numbers) on the other monitor(s), and manage Chrome so multiple windows remain accessible together.

---

## Immediate Steps (Easy)
1. Stop Chrome from being auto-assigned:
   - Right-click Chrome in Dock → Options → Assign To → **None**.
2. Turn off automatic space rearrange:
   - System Settings → Desktop & Dock (or Mission Control) → disable **Automatically rearrange Spaces based on most recent use**.
3. Maximize without native full-screen (no logout):
   - Option-click the green window button (Zoom) or hold green button for tile options.

---

## Enable per-display Fullscreen (best for single-monitor fullscreen)
1. System Settings / System Preferences → Desktop & Dock (or Mission Control).
2. Enable **Displays have separate Spaces**.
3. Log out and log back in for this to take effect.

Result: When you put VS Code fullscreen on monitor A, monitor B remains usable with other apps.

---

## Move / Merge Chrome Windows between Spaces
- Mission Control (Ctrl+Up): drag window thumbnails between Desktops.
- While in Mission Control, drop a window onto another window’s thumbnail to combine them in the same Space.

---

## Tile & Snap (view two Chrome windows together)
- Hold the green button → Tile Window to Left/Right.
- Use a window manager app: Rectangle (free), Magnet, or BetterSnapTool for precise snapping.

Recommended: Rectangle (open-source, supports shortcuts).

---

## If you want me to teach step-by-step interactively
- Add questions or say “Start lesson: Spaces basics” below.
- Example prompts you can paste here or into a fresh chat:
  - "Start lesson: Explain Spaces vs Desktops"
  - "Show step-by-step: enable Displays have separate Spaces (with screenshots)"
  - "Help set up Rectangle and shortcuts to tile two Chrome windows"

---

## Troubleshooting Notes
- If new Chrome windows open in other Spaces after these changes:
  - Confirm Dock → Options → Assign To is set to **None** for Chrome.
  - In System Settings → Desktop & Dock verify you've disabled auto-rearrange.
  - Restart Chrome if windows keep appearing in odd spaces.

---

## FAQ
Q: Will enabling "Displays have separate Spaces" break my current layout?
A: It changes how Spaces behave and requires logout; you may need to re-arrange apps once, but it enables independent full-screen per display.

Q: I like Chrome in different Spaces (work vs personal). How to manage?
A: Use multiple Chrome profiles with windows in the same Space, or pin a profile to a Desktop (Dock → Options → Assign To → This Desktop) — but pinned assignment moves all windows of that profile there.

---

## Next actions you can ask me to do here
- "Make a step-by-step screenshot guide for my macOS version"
- "Show Rectangle install & create two shortcuts to tile Chrome windows"
- "Explain how to combine Chrome windows into one Space"

---

(End of file)
