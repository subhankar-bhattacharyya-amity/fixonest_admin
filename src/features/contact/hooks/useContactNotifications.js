import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/features/auth/index.js";
import { CONTACT_NOTIFICATION_POLL_MS, getContactSeenKey } from "../definitions/contacts.js";
import { fetchContactNotifications } from "../store/contactSlice.js";

// localStorage can throw (private mode, blocked site data) - the bell then
// simply treats every message as unread until the next visit.
const readSeenAt = (key) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

const receivedAt = (contact) => new Date(contact.createdAt).getTime();

// Drives the Topbar bell: keeps the newest messages fresh (on mount, on a
// timer, and when the tab becomes visible again) and tracks which of them the
// signed-in user has already seen. Only mount it for the Super Admin and
// Admin - a Provider has no contact endpoint.
export function useContactNotifications() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { items, status } = useSelector((state) => state.contact.notifications);

  const seenKey = getContactSeenKey(user?._id ?? user?.email ?? "user");
  const [seenAt, setSeenAt] = useState(() => readSeenAt(seenKey));

  useEffect(() => {
    let isMounted = true;
    if (status === "idle") {
      dispatch(fetchContactNotifications());
    }
    const timer = setInterval(() => {
      if (isMounted && document.visibilityState === "visible") {
        dispatch(fetchContactNotifications());
      }
    }, CONTACT_NOTIFICATION_POLL_MS);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [dispatch, status]);

  const unreadCount = items.filter((item) => receivedAt(item) > seenAt).length;

  // "Read" up to the newest message's own createdAt (not this computer's
  // clock), so a clock that's off can't hide or resurrect a message.
  const markAllRead = useCallback(() => {
    const newest = items.length > 0 ? receivedAt(items[0]) : 0;
    if (newest <= seenAt) return;
    setSeenAt(newest);
    try {
      localStorage.setItem(seenKey, String(newest));
    } catch {
      // Still read for this visit - see readSeenAt above.
    }
  }, [items, seenAt, seenKey]);

  return { items, status, seenAt, unreadCount, markAllRead };
}
