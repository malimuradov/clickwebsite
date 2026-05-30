import React, {
  createContext, useContext, useEffect,
  useState, useRef, useCallback, useMemo,
} from 'react';
import io from 'socket.io-client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Decodes a JWT payload WITHOUT verifying the signature.
 * Used ONLY for restoring display state (username, userId) when offline.
 * The server always re-verifies tokens; this is purely for local UX.
 *
 * @param {string} token
 * @returns {Object|null}
 */
const decodeJWT = (token) => {
  try {
    const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(segment));
  } catch {
    return null;
  }
};

/**
 * Generates a local guest identity when the server is unreachable
 * and no stored credentials exist.
 *
 * @returns {{ id: string, username: string }}
 */
const generateLocalGuest = () => ({
  id:       `local_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
  username: `Guest_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
});

// ─── Offline event queue configuration ───────────────────────────────────────
//
//  'batch-sum' → numeric payloads accumulate; one flush emit per event type.
//                e.g. 42 offline clicks → one emit('incrementCount', 42)
//  'dedupe'    → only the latest payload is kept per event type.
//                e.g. skin changes: only the final choice matters.
//  'queue'     → every call is queued individually (FIFO).
//  (absent)    → event is silently dropped when offline.

const EVENT_STRATEGY = {
  incrementCount:   'batch-sum',
  updateUpgrades:   'dedupe',
  changeCursorSkin: 'dedupe',
  updateClickValue: 'dedupe',
  setUsername:      'dedupe',
};

const MAX_QUEUE_SIZE = 150; // hard cap — prevents unbounded memory growth

// ─── Connection states ────────────────────────────────────────────────────────
// 'connecting'   Initial connect attempt in progress.
// 'online'       Socket connected and user authenticated.
// 'reconnecting' Was online; lost connection; socket.io is retrying.
// 'offline'      Could not connect and max retries exhausted, or server
//                actively disconnected. App runs locally.

// ─── Context ──────────────────────────────────────────────────────────────────

const SocketContext = createContext(undefined);

export function SocketProvider({ children }) {
  const isDev      = process.env.NODE_ENV === 'development';
  const SERVER_URL = isDev ? 'http://0.0.0.0:4000' : 'http://52.59.228.62:8080';

  // ── Socket ref (stable, no re-renders) ──────────────────────────────────
  const socketRef = useRef(null);

  // ── Connection state ─────────────────────────────────────────────────────
  const [connectionState, _setConnectionState] = useState('connecting');
  const connStateRef = useRef('connecting');

  /** Keeps ref and state in sync so the emit closure never goes stale. */
  const setConnectionState = useCallback((state) => {
    connStateRef.current = state;
    _setConnectionState(state);
  }, []);

  // ── User identity ────────────────────────────────────────────────────────
  const [userId,      setUserId]      = useState(null);
  const [username,    setUsername]    = useState('');
  const [isTemporary, setIsTemporary] = useState(true);
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [equippedCursor, setEquippedCursor] = useState('default');
  const [cursors,     setCursors]     = useState({});

  // ── Event queue ──────────────────────────────────────────────────────────
  const queueRef      = useRef([]);   // [{ event, data }]
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = useCallback(() => {
    setPendingCount(queueRef.current.length);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Offline identity restoration
  // Priority: permanent token → temp token → local guest
  // ─────────────────────────────────────────────────────────────────────────

  const restoreOfflineIdentity = useCallback(() => {
    const token     = localStorage.getItem('token');
    const tempToken = localStorage.getItem('tempToken');

    if (token) {
      const decoded = decodeJWT(token);
      if (decoded?.id) {
        setUserId(decoded.id);
        setUsername(decoded.username ?? '');
        setIsLoggedIn(true);
        setIsTemporary(false);
        return;
      }
    }

    if (tempToken) {
      const decoded = decodeJWT(tempToken);
      if (decoded?.isTemporary && decoded?.id) {
        setUserId(decoded.id);
        setUsername(decoded.username ?? '');
        setIsTemporary(true);
        return;
      }
    }

    // No usable credentials — create a local-only guest
    const guest = generateLocalGuest();
    setUserId(guest.id);
    setUsername(guest.username);
    setIsTemporary(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Event queue management
  // ─────────────────────────────────────────────────────────────────────────

  const enqueue = useCallback((event, data) => {
    const strategy = EVENT_STRATEGY[event];
    if (!strategy) return; // not queueable — drop

    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      console.warn(`[socket:queue] Capacity (${MAX_QUEUE_SIZE}) reached; dropping oldest entry.`);
      queueRef.current.shift();
    }

    if (strategy === 'batch-sum') {
      const existing = queueRef.current.find(e => e.event === event);
      if (existing) {
        // Accumulate numeric values or clickValue objects
        if (typeof data === 'number') {
          existing.data = (existing.data ?? 0) + data;
        } else if (data?.clickValue !== undefined) {
          existing.data = {
            ...data,
            clickValue: (existing.data?.clickValue ?? 0) + data.clickValue,
          };
        }
        updatePendingCount();
        return;
      }
    }

    if (strategy === 'dedupe') {
      // Remove any prior entry for this event, then push the latest
      queueRef.current = queueRef.current.filter(e => e.event !== event);
    }

    queueRef.current.push({ event, data });
    updatePendingCount();
  }, [updatePendingCount]);

  /**
   * Flushes the event queue to the server.
   * Call AFTER authentication succeeds on reconnect.
   */
  const flushQueue = useCallback(() => {
    const sock = socketRef.current;
    if (!sock || queueRef.current.length === 0) return;

    console.log(`[socket:queue] Flushing ${queueRef.current.length} queued event(s)`);
    const snapshot = [...queueRef.current];
    queueRef.current = [];
    updatePendingCount();
    snapshot.forEach(({ event, data }) => sock.emit(event, data));
  }, [updatePendingCount]);

  // ─────────────────────────────────────────────────────────────────────────
  // Smart emit — the primary way components should send events.
  // Queues events when offline; emits immediately when online.
  //
  // Usage (in components):
  //   const { emit } = useSocket();
  //   emit('incrementCount', { clickValue: 1 });
  // ─────────────────────────────────────────────────────────────────────────

  const emit = useCallback((event, data) => {
    if (connStateRef.current === 'online' && socketRef.current) {
      socketRef.current.emit(event, data);
    } else {
      enqueue(event, data);
    }
  }, [enqueue]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auth helpers — reusable for initial connect and reconnect
  // ─────────────────────────────────────────────────────────────────────────

  const sendAuth = useCallback((sock) => {
    const token     = localStorage.getItem('token');
    const tempToken = localStorage.getItem('tempToken');

    if (token) {
      sock.emit('authenticate', token);
    } else if (tempToken) {
      sock.emit('authenticateTemp', tempToken);
    } else {
      sock.emit('createTempUser');
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Socket setup
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const sock = io(SERVER_URL, {
      reconnectionAttempts: 8,         // give up after 8 tries → go offline
      reconnectionDelay:    1_000,
      reconnectionDelayMax: 10_000,
      timeout:              8_000,
    });

    socketRef.current = sock;

    // ── Connection lifecycle ───────────────────────────────────────────────

    sock.on('connect', () => {
      console.log('[socket] Connected');
      setConnectionState('online');
      sendAuth(sock);
    });

    sock.on('disconnect', (reason) => {
      console.warn('[socket] Disconnected:', reason);
      // 'io server disconnect' means the server closed intentionally; don't auto-retry
      if (reason === 'io server disconnect') {
        setConnectionState('offline');
        restoreOfflineIdentity();
      } else {
        setConnectionState('reconnecting'); // socket.io will auto-retry
      }
    });

    sock.on('reconnect_attempt', (attempt) => {
      console.log(`[socket] Reconnect attempt ${attempt}`);
      setConnectionState('reconnecting');
    });

    sock.on('reconnect', () => {
      console.log('[socket] Reconnected');
      // sendAuth runs inside 'connect' event; flushQueue called after auth below
    });

    sock.on('reconnect_failed', () => {
      console.error('[socket] Reconnect failed — switching to offline mode');
      setConnectionState('offline');
      restoreOfflineIdentity();
    });

    sock.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message);
      // Don't set offline yet — let reconnect logic handle retries
      if (connStateRef.current === 'connecting') {
        setConnectionState('reconnecting');
      }
    });

    // ── Auth responses ─────────────────────────────────────────────────────

    /** Shared handler for any successful auth path. */
    const onAuthSuccess = ({ userId: uid, username: uname, isTemporary: temp, userData } = {}) => {
      if (!uid) return;
      setUserId(uid);
      setUsername(uname ?? '');
      setIsTemporary(!!temp);
      setIsLoggedIn(!temp);
      flushQueue(); // replay any offline events
    };

    sock.on('authenticationResult', onAuthSuccess);

    sock.on('tempUserCreated', ({ tempUserId, tempUsername, tempToken }) => {
      setUserId(tempUserId);
      setUsername(tempUsername);
      setIsTemporary(true);
      setIsLoggedIn(false);
      localStorage.setItem('tempToken', tempToken);
      localStorage.setItem('tempAccountData', JSON.stringify({ username: tempUsername, equippedCursor: 'default' }));
      flushQueue();
    });

    sock.on('tempAuthSuccess', ({ tempUserId, tempUsername, gameData }) => {
      setUserId(tempUserId);
      setUsername(tempUsername);
      setIsTemporary(true);
      setIsLoggedIn(false);
      if (gameData?.equippedCursor) setEquippedCursor(gameData.equippedCursor);
      localStorage.setItem('tempAccountData', JSON.stringify({ username: tempUsername, equippedCursor: gameData?.equippedCursor ?? 'default' }));
      flushQueue();
    });

    sock.on('tempAuthFailure', () => {
      console.warn('[socket] Temp token expired — creating new temp user');
      localStorage.removeItem('tempToken');
      localStorage.removeItem('tempAccountData');
      sock.emit('createTempUser');
    });

    sock.on('authenticationFailure', () => {
      // Permanent token rejected — fall back to temp or new guest
      const tempToken = localStorage.getItem('tempToken');
      if (tempToken) {
        sock.emit('authenticateTemp', tempToken);
      } else {
        sock.emit('createTempUser');
      }
    });

    sock.on('authenticationSuccess', ({ userId: uid, username: uname }) => {
      setUserId(uid);
      setUsername(uname ?? '');
      setIsLoggedIn(true);
      setIsTemporary(false);
      localStorage.removeItem('tempToken');
      localStorage.removeItem('tempAccountData');
      flushQueue();
    });

    // ── Real-time ──────────────────────────────────────────────────────────

    sock.on('updateCursors', setCursors);

    // ── Cleanup ────────────────────────────────────────────────────────────

    return () => {
      sock.removeAllListeners();
      sock.close();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  // Public API methods
  // ─────────────────────────────────────────────────────────────────────────

  /** Manually retry after going offline. */
  const retryConnection = useCallback(() => {
    const sock = socketRef.current;
    if (!sock) return;
    console.log('[socket] Manual reconnect triggered');
    setConnectionState('connecting');
    sock.connect();
  }, [setConnectionState]);

  const login = useCallback((credentials) => {
    emit('login', credentials);
  }, [emit]);

  const register = useCallback((userData) => {
    emit('register', userData);
  }, [emit]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsTemporary(true);
    setUserId(null);
    setUsername('');

    const sock = socketRef.current;
    if (!sock || connStateRef.current !== 'online') return;

    const tempToken = localStorage.getItem('tempToken');
    sock.emit(tempToken ? 'authenticateTemp' : 'createTempUser', tempToken ?? undefined);
  }, []);

  const upgradeToPermAccount = useCallback((userData) => {
    if (isTemporary && userId) {
      emit('upgradeTemp', { tempUserId: userId, ...userData });
    }
  }, [isTemporary, userId, emit]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────

  const isOffline = connectionState === 'offline';

  const value = useMemo(() => ({
    // Raw socket — use ONLY for attaching listeners (socket.on).
    // For emitting, use the `emit` wrapper below.
    socket: socketRef.current,

    // Smart emit: queues when offline, sends immediately when online.
    emit,

    // User identity
    userId,
    username,
    setUsername,
    isTemporary,
    isLoggedIn,
    equippedCursor,
    setEquippedCursor,

    // Multiplayer
    cursors,

    // Connection
    connectionState,       // 'connecting' | 'online' | 'reconnecting' | 'offline'
    isOffline,             // shorthand boolean
    pendingCount,          // how many events are queued (useful for UI indicator)
    retryConnection,

    // Auth
    login,
    register,
    logout,
    upgradeToPermAccount,
  }), [
    emit, userId, username, isTemporary, isLoggedIn,
    equippedCursor, cursors, connectionState, isOffline,
    pendingCount, retryConnection, login, register, logout, upgradeToPermAccount,
  ]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (ctx === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}