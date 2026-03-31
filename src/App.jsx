import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/pages/LoginPage";
import SignupPage from "./features/pages/SignupPage";
import MainPage from "./features/pages/MainPage";
import CreatePetPage from "./features/pages/CreatePetPage"; 
import RankingPage from "./features/pages/RankingPage"; 
import ChatPage from "./features/pages/ChatPage"; 
import LoungePage from "./features/pages/LoungePage";
import DatingPage from "./features/pages/DatingPage";
import FriendPage from "./features/pages/FriendPage"; 
import BreedingPage from "./features/pages/BreedingPage";
import ChildRoomPage from "./features/pages/ChildRoomPage";
import ChildFeedPage from "./features/pages/ChildFeedPage";
import ChildCleanPage from "./features/pages/ChildCleanPage";
import ChildPlayPage from "./features/pages/ChildPlayPage";
import MafiaListPage from "./features/pages/MafiaListPage";
import MafiaRoomPage from "./features/pages/MafiaRoomPage";
import MafiaGamePage from "./features/pages/MafiaGamePage";
import { GiftProvider } from "./contexts/GiftContext";
import GlobalNotificationHandler from "./components/GlobalNotificationHandler";

function App() {

  return (
    <GiftProvider>
      <BrowserRouter>
        <GlobalNotificationHandler />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/create-pet" element={<CreatePetPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/lounge" element={<LoungePage />} />
          <Route path="/dating/:roomId" element={<DatingPage />} />
          <Route path="/friends" element={<FriendPage />} />
          <Route path="/breeding" element={<BreedingPage />} />
          <Route path="/child-room" element={<ChildRoomPage />} />
          <Route path="/child-room/feed" element={<ChildFeedPage />} />
          <Route path="/child-room/clean" element={<ChildCleanPage />} />
          <Route path="/child-room/play" element={<ChildPlayPage />} />
          <Route path="/mafia" element={<MafiaListPage />} />
          <Route path="/mafia/:roomId" element={<MafiaRoomPage />} />
          <Route path="/mafia/:roomId/play" element={<MafiaGamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GiftProvider>
  );
}

export default App;
