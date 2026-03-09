import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/pages/LoginPage";
import SignupPage from "./features/pages/SignupPage";
import MainPage from "./features/pages/MainPage";
import CreatePetPage from "./features/pages/CreatePetPage"; // 펫 생성 페이지
import RankingPage from "./features/pages/RankingPage"; // 명예의 전당(랭킹)
import ChatPage from "./features/pages/ChatPage"; // 펫 대화하기(Chat)
import LoungePage from "./features/pages/LoungePage";
import DatingPage from "./features/pages/DatingPage";
import FriendPage from "./features/pages/FriendPage"; // 신규 친구 전용 페이지
import DD from "./features/DD/DD";
import MS from "./features/MS/MS";
import SH from "./features/SH/SH";
import BreedingPage from "./features/pages/BreedingPage";
import ChildRoomPage from "./features/pages/ChildRoomPage";
import { GiftProvider } from "./contexts/GiftContext";

function App() {
  // test

  return (
    <GiftProvider>
      <BrowserRouter>
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
          <Route path="/dd" element={<DD />} />
          <Route path="/ms" element={<MS />} />
          <Route path="/sh" element={<SH />} />
          <Route path="/breeding" element={<BreedingPage />} />
          <Route path="/child-room" element={<ChildRoomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GiftProvider>
  );
}

export default App;
