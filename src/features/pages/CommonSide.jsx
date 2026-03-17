import { useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiSmile,
  FiAward,
  FiMessageCircle,
  FiUsers,
  FiUserCheck,
  FiHeart,
  FiMap,
} from 'react-icons/fi';

const CommonSide = ({ activeMenu }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
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

  return (
    <aside className="fixed bottom-0 lg:relative w-full lg:w-64 h-20 lg:h-screen border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl z-50 flex lg:flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:shadow-none transition-colors overflow-hidden">
      {/* 1. 데스크탑 전용 로고 */}
      <h2 className="hidden lg:block text-[10px] font-black text-slate-300 dark:text-slate-600 p-10 pb-0 tracking-[0.4em] text-center uppercase italic">
        EggTalk
      </h2>

      {/* 2. 메인 네비게이션 트랙 */}
      <nav className="flex-1 flex lg:flex-col items-center lg:items-center lg:p-10 overflow-hidden">
        <div className="flex-1 flex lg:flex-col items-center justify-center overflow-x-auto lg:overflow-visible no-scrollbar gap-1 lg:gap-3 w-full">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-4 px-3 py-2 lg:px-5 lg:py-3.5 rounded-2xl transition-all h-[65px] lg:h-auto min-w-[70px] lg:min-w-0 lg:w-full flex-shrink-0 ${
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

          {/* [모바일 전용] 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="flex lg:hidden flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all h-[65px] min-w-[70px] flex-shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <FiLogOut className="text-xl shrink-0" />
            <span className="text-[9px] font-black whitespace-nowrap uppercase">
              Out
            </span>
          </button>
        </div>
      </nav>

      {/* 데스크탑 전용 하단 로그아웃 */}
      <div className="hidden lg:flex p-10 border-t border-slate-50 dark:border-slate-800 justify-center">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-4 px-5 py-3.5 w-full text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <FiLogOut className="text-lg shrink-0" />
          <span className="text-[12px] font-black uppercase tracking-widest whitespace-nowrap">
            Sign Out
          </span>
        </button>
      </div>

      {/* 스크롤바 숨김 스타일 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `,
        }}
      />
    </aside>
  );
};

export default CommonSide;
