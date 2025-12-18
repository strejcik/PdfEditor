// src/hooks/useShare.js
import { useCallback, useRef, useState } from "react";
import { useLiveShare } from "./useLiveShare";

export const useShare = () => {
  const getStateRef = useRef(null);
  const getMethodsRef = useRef(null);

  // snapshot (host -> viewers)
  const getAppState = () => {
    const stateGetter = getStateRef.current;
    // Support both function (real-time) and object (cached) for backward compatibility
    return typeof stateGetter === 'function' ? stateGetter() : stateGetter;
  };
  const getMethods = () => getMethodsRef.current;

  // viewer apply (viewer <- host)
  const applyFullState = (s) => {
    if (!s || !s.state) return;

    const m = getMethods();
    if (!m) return;

    if (typeof s.state.activePage === "number") m.setActivePage?.(s.state.activePage);
    if (Array.isArray(s.state.pageList)) m.setPages?.(s.state.pageList);
    if (Array.isArray(s.state.textItems)) m.setTextItems?.(s.state.textItems);
    if (Array.isArray(s.state.shapeItems)) m.setShapeItems?.(s.state.shapeItems);
  };

  // live share hook (contains socket + password modals)
  const live = useLiveShare({ getAppState, applyFullState });

  const {
    mode,
    roomId,
    makeViewerLink,
    viewerCount,

    // modal controls from useLiveShare
    openHostPasswordModal,
    submitHostPassword,

    hostPwModal,
    viewerPwModal,
    cancelHostPasswordModal,
    cancelViewerPasswordModal,
    submitViewerPassword,
  } = live;

  const isViewer = mode === "viewer";
  const broadcasterRef = useRef(null);

  // ----------------------------
  // ShareLinkModal state (NEW)
  // ----------------------------
  const [shareLinkModal, setShareLinkModal] = useState({
    open: false,
    link: "",
    copied: false,
  });

  const closeShareLinkModal = useCallback(() => {
    setShareLinkModal((s) => ({ ...s, open: false }));
  }, []);

  const copyShareLinkAgain = useCallback(async () => {
    const link = shareLinkModal.link;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setShareLinkModal((s) => ({ ...s, copied: true }));
    } catch {
      setShareLinkModal((s) => ({ ...s, copied: false }));
    }
  }, [shareLinkModal.link]);

  // ----------------------------
  // Share flow
  // ----------------------------

  // called by Share button -> opens host password modal
  const onStartShare = useCallback(() => {
    if (mode === "host") return;
    openHostPasswordModal();
  }, [mode, openHostPasswordModal]);

  // called by HostPasswordModal "Start sharing"
  const onConfirmHostPassword = useCallback(
    async (password) => {
      // 1) create room + join as host
      const b = await submitHostPassword(password);
      if (!b) return null;

      broadcasterRef.current = b;

      // 2) generate viewer link
      const link = makeViewerLink(b.room);

      // 3) copy to clipboard (best-effort)
      let copied = false;
      try {
        await navigator.clipboard.writeText(link);
        copied = true;
      } catch {
        copied = false;
      }

      // 4) open ShareLinkModal (instead of alert/prompt)
      setShareLinkModal({
        open: true,
        link,
        copied,
      });

      return { room: b.room, link, copied };
    },
    [makeViewerLink, submitHostPassword]
  );

  return {
    // existing wiring
    getStateRef,
    getMethodsRef,
    broadcasterRef,
    isViewer,
    roomId,
    mode,
    viewerCount,

    // share actions
    onStartShare,
    onConfirmHostPassword,

    // modals from useLiveShare
    hostPwModal,
    viewerPwModal,
    cancelHostPasswordModal,
    cancelViewerPasswordModal,
    submitViewerPassword,

    // ShareLinkModal (NEW)
    shareLinkModal,
    closeShareLinkModal,
    copyShareLinkAgain,

    // optional access
    makeViewerLink,
    live,
  };
};
