import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../utils/socket";
import api from "../utils/config";
import DatingInvitationModal from "../features/pages/components/DatingInvitationModal";
import ChildRoomInvitationModal from "../features/pages/components/ChildRoomInvitationModal";

const GlobalNotificationHandler = () => {
  const navigate = useNavigate();
  const [datingInvitation, setDatingInvitation] = useState(null);
  const [childInvitation, setChildInvitation] = useState(null);

  useEffect(() => {
    const getSanitizedName = (val) => {
      if (!val) return "";
      if (typeof val === "object") return (val.petName || val.name || String(val)).toLowerCase().trim();
      return String(val).toLowerCase().trim();
    };

    const handleDatingInvitation = (data) => {
      console.log("[DEBUG-FRONT] dating_invitation received:", data);
      const myPetName = localStorage.getItem("petName");
      
      const normalizedMyName = getSanitizedName(myPetName);
      const normalizedTargetName = getSanitizedName(data.receiverPetName);

      if (!normalizedMyName || !normalizedTargetName) {
        console.warn("[DEBUG-FRONT] Missing name for comparison:", { normalizedMyName, normalizedTargetName });
        return;
      }

      if (normalizedMyName === normalizedTargetName) {
        console.log("[GlobalNotificationHandler] SUCCESS: It's for me!");
        setDatingInvitation(data);
      } else {
        console.log(`[DEBUG-FRONT] SKIP: Not for me. (${normalizedTargetName} vs ${normalizedMyName})`);
      }
    };

    const handleChildInvitation = (data) => {
      console.log("[DEBUG-FRONT] child_room_invitation received:", data);
      const myPetName = localStorage.getItem("petName");

      const normalizedMyName = getSanitizedName(myPetName);
      const normalizedTargetName = getSanitizedName(data.receiverPetName);

      if (!normalizedMyName || !normalizedTargetName) return;

      if (normalizedMyName === normalizedTargetName) {
        console.log("[GlobalNotificationHandler] SUCCESS: Matching child invitation for me!", data);
        setChildInvitation(data);
      } else {
        console.log(`[DEBUG-FRONT] MISMATCH: Child invite not for me. (${normalizedTargetName} vs ${normalizedMyName})`);
      }
    };

    socket.on("dating_invitation", handleDatingInvitation);
    socket.on("child_room_invitation", handleChildInvitation);

    return () => {
      socket.off("dating_invitation", handleDatingInvitation);
      socket.off("child_room_invitation", handleChildInvitation);
    };
  }, []);

  const handleAcceptDating = async () => {
    if (!datingInvitation) return;
    const { roomId } = datingInvitation;
    const petName = localStorage.getItem("petName");

    if (!petName) {
      setDatingInvitation(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await api.post(
        `/api/rooms/${roomId}/join`,
        { petName },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        socket.emit("trigger_rooms_update");
        setDatingInvitation(null);
        navigate(`/dating/${roomId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "방 입장에 실패했습니다.");
      setDatingInvitation(null);
    }
  };

  const handleAcceptChild = () => {
    if (!childInvitation) return;
    setChildInvitation(null);
    navigate(`/child-room`);
  };

  return (
    <>
      <DatingInvitationModal
        isOpen={!!datingInvitation}
        onClose={() => setDatingInvitation(null)}
        onAccept={handleAcceptDating}
        requesterPetName={datingInvitation?.requesterPetName}
        roomName={datingInvitation?.roomName}
      />
      <ChildRoomInvitationModal
        isOpen={!!childInvitation}
        onClose={() => setChildInvitation(null)}
        onAccept={handleAcceptChild}
        requesterPetName={childInvitation?.requesterPetName}
        childPetName={childInvitation?.childPetName}
      />
    </>
  );
};

export default GlobalNotificationHandler;
