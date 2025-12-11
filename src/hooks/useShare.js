import { useRef } from "react";
import { useLiveShare } from '../hooks/useLiveShare';
export const useShare = () =>{
  const getStateRef = useRef(null);
  const getMethodsRef = useRef(null);
// Build snapshot (what viewers see)
  let getAppState = () => (getStateRef.current);
  let getMethods = () => (getMethodsRef.current);

 // Replace local state with a snapshot (viewer)
  const applyFullState = (s) => {
    if (typeof s.state.activePage === "number") getMethods().setActivePage(s.state.activePage);
    if (Array.isArray(s.state.pageList)) getMethods().setPages(s.state.pageList);
    getMethods().setTextItems(s.state.textItems);
  };

const { mode, roomId, startHosting, startViewing, makeViewerLink } = useLiveShare({
    getAppState,
    applyFullState,
  });

  const isViewer = mode === "viewer";






   // ====== Host controls ======
  const broadcasterRef = useRef(null);
  async function onStartShare() {
    if (mode === "host") return;
    const b = await startHosting();
    broadcasterRef.current = b;
    const link = makeViewerLink(b.room, b.viewerToken);
    try {
      await navigator.clipboard.writeText(link);
      alert("Share link copied:\n" + link);
    } catch {
      prompt("Copy this link:", link);
    }
  }




  return {
    onStartShare,
    getAppState,
    startViewing,
    getMethodsRef,
    isViewer,
    roomId,
    mode,
    broadcasterRef,
    getStateRef
  }
  
}
