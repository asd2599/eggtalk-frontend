import { useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import {
  FiLogOut, FiSmile, FiAward, FiMessageCircle,
  FiUsers, FiUserCheck, FiHeart, FiMap,
} from 'react-icons/fi';
import socket from '../../utils/socket';

const CommonSide = ({ activeMenu }) => {
  const navigate = useNavigate();
  const navScrollRef = useRef(null);
  const buttonRefs = useRef({});

  const handleLogout = () => {
    // 소켓 연결 해제 신호 전송 (온라인 리스트 제거용)
    const petName = localStorage.getItem('petName');
    if (petName) {
      socket.emit("user_logout", petName);
    }
    
    // 스토리지 비우기 및 라우팅
    localStorage.removeItem('token');
    localStorage.removeItem('petName');
    localStorage.removeItem('petId');
    navigate('/');
  };

  const menuItems = [
    { icon: FiSmile, label: '내 펫', path: '/main' },
    { icon: FiHeart, label: '육아', path: '/child-room' },
    { icon: FiAward, label: '랭킹', path: '/ranking' },
    { icon: FiMessageCircle, label: '대화', path: '/chat' },
    { icon: FiUsers, label: '모임', path: '/lounge' },
    { icon: FiUserCheck, label: '친구', path: '/friends' },
    { icon: FiMap, label: '길찾기', path: '/ms' },
  ];

  const scrollToCenter = (label) => {
    const container = navScrollRef.current;
    const button = buttonRefs.current[label];

    if (container && button) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      const scrollLeft =
        container.scrollLeft +
        (buttonRect.left + buttonRect.width / 2) -
        (containerRect.left + containerRect.width / 2);

      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  // 페이지 진입 시 activeMenu 중앙 정렬
  useEffect(() => {
    scrollToCenter(activeMenu);
  }, [activeMenu]);

  const handleMenuClick = (item) => {
    scrollToCenter(item.label);
    setTimeout(() => {
      navigate(item.path);
    }, 150);
  };

  return (
    <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-20 lg:h-screen border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:shadow-none transition-colors">
      <h2 className="hidden lg:block text-[10px] font-black text-slate-300 dark:text-slate-600 p-10 pb-0 tracking-[0.4em] text-center uppercase italic">
        EggTalk
      </h2>

      <nav className="flex-1 flex lg:flex-col items-center lg:items-center lg:p-10 min-w-0">
        <div
          ref={navScrollRef}
          className="flex lg:flex-col items-center justify-start overflow-x-auto lg:overflow-visible no-scrollbar gap-1 lg:gap-3 w-full h-full"
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              ref={(el) => (buttonRefs.current[item.label] = el)}
              onClick={() => handleMenuClick(item)}
              className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-4 px-3 py-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all h-[65px] lg:h-auto min-w-[70px] lg:min-w-0 lg:w-full shrink-0 ${
                activeMenu === item.label
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg font-bold'
                  : 'text-slate-400 hover:text-slate-900 dark:hover:text-sky-400'
              }`}
            >
              <item.icon className="text-xl lg:text-lg shrink-0" />
              <span className="text-[9px] lg:text-[13px] font-black whitespace-nowrap uppercase">
                {item.label}
              </span>
            </button>
          ))}

          <button
            onClick={handleLogout}
            className="flex lg:hidden flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all h-[65px] min-w-[70px] shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <FiLogOut className="text-xl shrink-0" />
            <span className="text-[9px] font-black whitespace-nowrap uppercase">Out</span>
          </button>
        </div>
      </nav>

      <div className="hidden lg:flex p-10 border-t border-slate-50 dark:border-slate-800 justify-center">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-4 px-5 py-3.5 w-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <FiLogOut className="text-lg shrink-0" />
          <span className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap">Sign Out</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </aside>
  );
};

export default CommonSide;